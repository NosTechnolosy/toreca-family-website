import type { Env } from "./types";

export class GitHubConflictError extends Error {}
export class GitHubRequestError extends Error {}

type FileChange = {
  path: string;
  content: string | Uint8Array | null;
};

type RefResponse = { object: { sha: string } };
type CommitResponse = { tree: { sha: string } };
type BlobResponse = { sha: string };
type TreeResponse = { sha: string };
type CreatedCommit = { sha: string };
export async function readTextFile(env: Env, path: string): Promise<string | null> {
  const response = await githubFetch(
    env,
    `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodePath(path)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`,
    { headers: { Accept: "application/vnd.github.raw+json" } },
    true
  );
  if (response.status === 404) return null;
  if (!response.ok) throw await githubError(response);
  return response.text();
}

export async function commitFiles(
  env: Env,
  changes: FileChange[],
  message: string
): Promise<string> {
  const ownerRepo = `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}`;
  const refName = `heads/${env.GITHUB_BRANCH}`;
  const ref = await json<RefResponse>(
    await githubFetch(env, `${ownerRepo}/git/ref/${encodePath(refName)}`)
  );
  const expectedHead = ref.object.sha;
  const commit = await json<CommitResponse>(
    await githubFetch(env, `${ownerRepo}/git/commits/${expectedHead}`)
  );

  const treeEntries = await Promise.all(
    changes.map(async (change) => {
      if (change.content === null) {
        return { path: change.path, mode: "100644", type: "blob", sha: null };
      }
      const binary = typeof change.content === "string"
        ? new TextEncoder().encode(change.content)
        : change.content;
      const blob = await json<BlobResponse>(
        await githubFetch(env, `${ownerRepo}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({
            content: bytesToBase64(binary),
            encoding: "base64"
          })
        })
      );
      return { path: change.path, mode: "100644", type: "blob", sha: blob.sha };
    })
  );

  const tree = await json<TreeResponse>(
    await githubFetch(env, `${ownerRepo}/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: commit.tree.sha, tree: treeEntries })
    })
  );
  const nextCommit = await json<CreatedCommit>(
    await githubFetch(env, `${ownerRepo}/git/commits`, {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [expectedHead]
      })
    })
  );
  const update = await githubFetch(
    env,
    `${ownerRepo}/git/refs/${encodePath(refName)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ sha: nextCommit.sha, force: false })
    },
    false,
    true
  );
  if (update.status === 409 || update.status === 422) {
    throw new GitHubConflictError("別の更新と重なりました。もう一度お試しください。");
  }
  if (!update.ok) throw await githubError(update);
  return nextCommit.sha;
}

async function githubFetch(
  env: Env,
  path: string,
  init: RequestInit = {},
  allowNotFound = false,
  allowConflict = false
) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "toreca-family-update-worker",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers
    }
  });
  const acceptedNotFound = allowNotFound && response.status === 404;
  const acceptedConflict = allowConflict &&
    (response.status === 409 || response.status === 422);
  if (!response.ok && !acceptedNotFound && !acceptedConflict) {
    throw await githubError(response);
  }
  return response;
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw await githubError(response);
  return response.json<T>();
}

async function githubError(response: Response) {
  const requestId = response.headers.get("x-github-request-id");
  const suffix = requestId ? `（照会番号: ${requestId}）` : "";
  return new GitHubRequestError(
    `公開データを保存できませんでした。しばらく待ってから再度お試しください。${suffix}`
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}
