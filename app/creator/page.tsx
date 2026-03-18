"use client";

import { useState } from "react";
import { useCreator } from "@/components/creator-provider";

export default function CreatorPage() {
  const {
    profiles,
    activeProfile,
    activeProfileId,
    addProfile,
    setActiveProfileId,
    updateActiveProfile
  } = useCreator();
  const [newProfileName, setNewProfileName] = useState("");

  return (
    <main className="page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Creator Foundation</p>
          <h1>Start telling the app which creator it is working for and how her Instagram account should connect.</h1>
          <p className="lede">
            This is the first real account layer. It lets the app know which creator
            is active, keeps saved data scoped to that creator, and gives us a place
            to prepare the Instagram connection setup.
          </p>
        </div>
        <div className="hero__note">
          <span className="hero__badge">Foundation</span>
          <p>
            This is not full live login yet. It is the groundwork that makes later
            authentication and Instagram sync much cleaner to build.
          </p>
        </div>
      </section>

      <section className="creator-grid">
        <article className="panel">
          <div className="suggestions-card__header">
            <p className="eyebrow">Creator Profile</p>
            <span className="suggestions-card__tag">Who this data belongs to</span>
          </div>
          <div className="creator-form">
            <label className="input-card">
              <span className="input-card__label">Active Creator</span>
              <select
                className="input-card__field"
                value={activeProfileId}
                onChange={(event) => setActiveProfileId(event.target.value)}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              <span className="input-card__help">
                Switching the active creator changes which saved app data is being used.
              </span>
            </label>

            <div className="creator-add">
              <input
                className="input-card__field"
                placeholder="Add another creator name"
                value={newProfileName}
                onChange={(event) => setNewProfileName(event.target.value)}
              />
              <button
                className="input-toolbar__button"
                type="button"
                onClick={() => {
                  addProfile(newProfileName);
                  setNewProfileName("");
                }}
              >
                Add creator
              </button>
            </div>

            <label className="input-card">
              <span className="input-card__label">Creator Name</span>
              <input
                className="input-card__field"
                value={activeProfile.name}
                onChange={(event) => updateActiveProfile({ name: event.target.value })}
              />
            </label>

            <label className="input-card">
              <span className="input-card__label">Instagram Handle</span>
              <input
                className="input-card__field"
                value={activeProfile.instagramHandle}
                onChange={(event) =>
                  updateActiveProfile({ instagramHandle: event.target.value })
                }
              />
            </label>
          </div>
        </article>

        <article className="panel">
          <div className="suggestions-card__header">
            <p className="eyebrow">Instagram Connection Setup</p>
            <span className="suggestions-card__tag">Prep for live sync</span>
          </div>
          <div className="creator-form">
            <label className="input-card">
              <span className="input-card__label">Account Type</span>
              <select
                className="input-card__field"
                value={activeProfile.accountType}
                onChange={(event) =>
                  updateActiveProfile({
                    accountType: event.target.value as "Creator" | "Business"
                  })
                }
              >
                <option value="Creator">Creator</option>
                <option value="Business">Business</option>
              </select>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={activeProfile.facebookPageLinked}
                onChange={(event) =>
                  updateActiveProfile({ facebookPageLinked: event.target.checked })
                }
              />
              <span>Instagram is linked to the required Facebook Page</span>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={activeProfile.insightsPermissionReady}
                onChange={(event) =>
                  updateActiveProfile({ insightsPermissionReady: event.target.checked })
                }
              />
              <span>Meta app / insights permission setup is ready for connection work</span>
            </label>

            <label className="input-card">
              <span className="input-card__label">Connection Status</span>
              <select
                className="input-card__field"
                value={activeProfile.status}
                onChange={(event) =>
                  updateActiveProfile({
                    status: event.target.value as
                      | "Setup needed"
                      | "Ready to connect"
                      | "Connected later"
                  })
                }
              >
                <option value="Setup needed">Setup needed</option>
                <option value="Ready to connect">Ready to connect</option>
                <option value="Connected later">Connected later</option>
              </select>
            </label>
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel breakdown-card">
          <p className="eyebrow">What This Unlocks</p>
          <h2>This is the bridge from a one-browser prototype into a real creator app.</h2>
          <p>
            Once the app knows which creator is active, saved numbers can belong to
            that creator instead of some generic browser session. That is what makes
            future cloud saving, creator accounts, and account-specific insights possible.
          </p>
          <p>
            A real live Instagram login still needs Meta app credentials and OAuth.
            This page gives that future connection a proper place to live in the product.
          </p>
        </article>

        <article className="panel suggestions-card">
          <div className="suggestions-card__header">
            <p className="eyebrow">Known Limitation</p>
            <span className="suggestions-card__tag">Before live Instagram sync</span>
          </div>
          <ul>
            <li>Real Instagram connection still needs a Meta app and OAuth flow.</li>
            <li>The creator account should be a professional account for insights access.</li>
            <li>Meta permissions and app review work still have to be done for live data.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
