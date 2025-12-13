import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="p-8 animate-in">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-foreground-muted mb-8">
          Manage your account and preferences.
        </p>

        {/* Profile Section */}
        <section className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl font-medium">
              U
            </div>
            <div>
              <p className="font-medium">User Name</p>
              <p className="text-sm text-foreground-muted">user@example.com</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Display Name
              </label>
              <input
                type="text"
                id="name"
                className="input"
                defaultValue="User Name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="input"
                defaultValue="user@example.com"
                disabled
              />
              <p className="text-xs text-foreground-subtle mt-1">
                Email is managed by GitHub
              </p>
            </div>
          </div>
        </section>

        {/* Connected Accounts */}
        <section className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <div>
                <p className="font-medium">GitHub</p>
                <p className="text-sm text-foreground-muted">Connected</p>
              </div>
            </div>
            <span className="badge-success">Active</span>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="card border-error/30">
          <h2 className="text-lg font-semibold mb-4 text-error">Danger Zone</h2>
          <p className="text-sm text-foreground-muted mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button className="btn bg-error/10 text-error hover:bg-error/20">
            Delete Account
          </button>
        </section>
      </div>
    </div>
  );
}

