const REPO_URL = 'https://github.com/ahmedsaed/lithophane-maker';
/** The printing guide, on the default branch. */
export const GUIDE_URL = `${REPO_URL}/blob/HEAD/PRINTING.md`;

function GitHubMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** Icon link to the repository, for the header. */
export function GitHubIconLink() {
  return (
    <a className="github-icon" href={REPO_URL} target="_blank" rel="noopener noreferrer" title="View on GitHub" aria-label="View on GitHub">
      <GitHubMark size={18} />
    </a>
  );
}

/** Sidebar card inviting people to report issues and contribute. */
export default function GitHubCard() {
  return (
    <div className="github-card">
      <div className="github-card-title">
        <GitHubMark />
        <span>Free &amp; open source</span>
      </div>
      <p>
        This tool is MIT-licensed. Found a bug, printed a cube, or have an idea?
        Open an issue or send a pull request.
      </p>
      <div className="github-card-links">
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">View on GitHub</a>
        <a href={`${REPO_URL}/issues/new`} target="_blank" rel="noopener noreferrer">Report an issue</a>
      </div>
    </div>
  );
}
