import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AVAILABLE_AVATARS, createProfile, getActiveProfile, listProfiles, switchProfile } from '../lib/profiles';

export default function ProfileSwitcher() {
  const [profiles, setProfiles] = useState(() => listProfiles());
  // Never changes within a mount — switching/creating a profile always
  // reloads the page, so there's no need to update this in place.
  const [active] = useState(() => getActiveProfile());
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVAILABLE_AVATARS[0]);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const routerLocation = useLocation();

  // <details> has no native "close on route change" behavior — the header
  // persists across every page in this SPA, so close it explicitly.
  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [routerLocation.pathname]);

  // <details> also has no native "close on outside click" behavior.
  useEffect(() => {
    function handleDocumentClick(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  function resetAddForm() {
    setAdding(false);
    setName('');
    setAvatar(AVAILABLE_AVATARS[0]);
  }

  function handleSwitch(id: string) {
    if (id === active.id) {
      if (detailsRef.current) detailsRef.current.open = false;
      return;
    }
    switchProfile(id);
    window.location.reload();
  }

  function handleCreate() {
    const created = createProfile(name, avatar);
    if (!created) return;
    setProfiles((p) => [...p, created]);
    switchProfile(created.id);
    window.location.reload();
  }

  return (
    <details ref={detailsRef} className="relative ml-auto">
      <summary className="cursor-pointer list-none whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold text-white/85 hover:bg-white/15">
        {active.avatar} {active.name}
      </summary>
      <div className="absolute right-0 mt-2 w-60 bg-white text-ink border border-line rounded-lg shadow-lg z-30 p-2 grid gap-1">
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleSwitch(p.id)}
            className={`text-left px-2 py-1.5 rounded text-sm font-semibold ${
              p.id === active.id ? 'bg-eagle-pale text-eagle-dark' : 'hover:bg-paper'
            }`}
          >
            {p.avatar} {p.name}
          </button>
        ))}

        {profiles.length < 4 && !adding && (
          <button
            type="button"
            className="text-left px-2 py-1.5 rounded text-sm font-semibold text-copper hover:bg-paper"
            onClick={() => setAdding(true)}
          >
            + Add profile
          </button>
        )}

        {adding && (
          <div className="border-t border-line mt-1 pt-2 grid gap-2">
            <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`text-lg px-1.5 py-1 rounded border ${avatar === a ? 'border-eagle bg-eagle-pale' : 'border-line'}`}
                  aria-label={`Choose avatar ${a}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary !py-1.5 text-sm"
                onClick={handleCreate}
                disabled={!name.trim()}
              >
                Create &amp; switch
              </button>
              <button type="button" className="btn-ghost !py-1.5 text-sm" onClick={resetAddForm}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
