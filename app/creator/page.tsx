"use client";

import { useEffect, useState } from "react";
import { useCreator } from "@/components/creator-provider";
import {
  assistantFocusOptions,
  assistantToneOptions,
  buildAssistantMemoryStorageKey,
  buildDefaultAssistantMemory,
  type AssistantMemory
} from "@/lib/assistant-memory";

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
  const [assistantMemory, setAssistantMemory] = useState<AssistantMemory>(() =>
    buildDefaultAssistantMemory(activeProfile.name)
  );
  const [hasLoadedAssistantMemory, setHasLoadedAssistantMemory] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(buildAssistantMemoryStorageKey(activeProfile.id));

    if (!saved) {
      setAssistantMemory(buildDefaultAssistantMemory(activeProfile.name));
      setHasLoadedAssistantMemory(true);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Partial<AssistantMemory>;
      setAssistantMemory({
        ...buildDefaultAssistantMemory(activeProfile.name),
        ...parsed
      });
      setHasLoadedAssistantMemory(true);
    } catch {
      setAssistantMemory(buildDefaultAssistantMemory(activeProfile.name));
      setHasLoadedAssistantMemory(true);
    }
  }, [activeProfile.id, activeProfile.name]);

  useEffect(() => {
    if (!hasLoadedAssistantMemory) {
      return;
    }

    window.localStorage.setItem(
      buildAssistantMemoryStorageKey(activeProfile.id),
      JSON.stringify(assistantMemory)
    );
  }, [activeProfile.id, assistantMemory, hasLoadedAssistantMemory]);

  function updateAssistantMemory(updates: Partial<AssistantMemory>) {
    setAssistantMemory((current) => ({ ...current, ...updates }));
  }

  return (
    <main className="page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Creator Foundation</p>
          <h1>Set up the active creator profile and the Instagram account details this workspace will eventually connect to.</h1>
          <p className="lede">
            This page is now the account setup room behind the profile menu. It tells
            the app which creator is active, keeps saved data scoped to that creator,
            and gives us a place to prepare the Instagram connection setup.
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

        <article className="panel assistant-settings">
          <div className="suggestions-card__header">
            <p className="eyebrow">Assistant Memory</p>
            <span className="suggestions-card__tag">What your assistant remembers</span>
          </div>
          <div className="creator-form">
            <label className="input-card">
              <span className="input-card__label">Assistant Name</span>
              <input
                className="input-card__field"
                value={assistantMemory.assistantName}
                onChange={(event) =>
                  updateAssistantMemory({ assistantName: event.target.value })
                }
              />
              <span className="input-card__help">
                This is the persona label the homepage assistant will use.
              </span>
            </label>

            <div className="input-grid">
              <label className="input-card">
                <span className="input-card__label">Tone</span>
                <select
                  className="input-card__field"
                  value={assistantMemory.tone}
                  onChange={(event) =>
                    updateAssistantMemory({
                      tone: event.target.value as AssistantMemory["tone"]
                    })
                  }
                >
                  {assistantToneOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="input-card">
                <span className="input-card__label">Focus Mode</span>
                <select
                  className="input-card__field"
                  value={assistantMemory.focus}
                  onChange={(event) =>
                    updateAssistantMemory({
                      focus: event.target.value as AssistantMemory["focus"]
                    })
                  }
                >
                  {assistantFocusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="input-card">
              <span className="input-card__label">Main Goal</span>
              <textarea
                className="input-card__field input-card__field--short-textarea"
                value={assistantMemory.mainGoal}
                onChange={(event) =>
                  updateAssistantMemory({ mainGoal: event.target.value })
                }
              />
            </label>

            <label className="input-card">
              <span className="input-card__label">Current Priority</span>
              <textarea
                className="input-card__field input-card__field--short-textarea"
                value={assistantMemory.currentPriority}
                onChange={(event) =>
                  updateAssistantMemory({ currentPriority: event.target.value })
                }
              />
            </label>

            <label className="input-card">
              <span className="input-card__label">Success Signal</span>
              <textarea
                className="input-card__field input-card__field--short-textarea"
                value={assistantMemory.successSignal}
                onChange={(event) =>
                  updateAssistantMemory({ successSignal: event.target.value })
                }
              />
            </label>

            <label className="input-card">
              <span className="input-card__label">Manager Notes</span>
              <textarea
                className="input-card__field input-card__field--short-textarea"
                value={assistantMemory.managerNotes}
                onChange={(event) =>
                  updateAssistantMemory({ managerNotes: event.target.value })
                }
              />
            </label>

            <label className="input-card">
              <span className="input-card__label">Creator Context</span>
              <textarea
                className="input-card__field input-card__field--short-textarea"
                value={assistantMemory.creatorContext}
                onChange={(event) =>
                  updateAssistantMemory({ creatorContext: event.target.value })
                }
              />
              <span className="input-card__help">
                Use this for things like your style, working preferences, what confuses you,
                or what kind of support helps most.
              </span>
            </label>
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel suggestions-card">
          <div className="suggestions-card__header">
            <p className="eyebrow">Safety Reminder</p>
            <span className="suggestions-card__tag">Before live Instagram sync</span>
          </div>
          <ul>
            <li>Use the profile menu to review the Safety and Security room before connecting real accounts.</li>
            <li>Real Instagram connection still needs a Meta app and OAuth flow.</li>
            <li>The creator account should be a professional account for insights access.</li>
            <li>Meta permissions and app review work still have to be done for live data.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
