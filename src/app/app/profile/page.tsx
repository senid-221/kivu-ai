"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type Profile = {
  name: string;
  email: string;
  phone: string;
  bio: string;
  location: string;
  education: string;
  skills: string;
  avatar: string;
  cvName: string;
};

const empty: Profile = {
  name: "", email: "", phone: "", bio: "", location: "",
  education: "", skills: "", avatar: "", cvName: ""
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(empty);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const cvInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      const u = d.user || {};
      setProfile(p => ({ ...p, ...u }));
    });
  }, []);

  function update(key: keyof Profile, value: string) {
    setProfile(p => ({ ...p, [key]: value }));
  }

  function pickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("avatar", String(reader.result));
    reader.readAsDataURL(file);
  }

  function pickCV(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) update("cvName", file.name);
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const r = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setProfile(p => ({ ...p, ...d.user }));
      setMessage("Profile saved successfully.");
    } catch {
      setMessage("Unable to save profile changes.");
    } finally {
      setSaving(false);
    }
  }

  const initials = (profile.name || "K U").split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();

  return (
    <main className="profileDashboard">
      <section className="profileHero">
        <div>
          <span className="profileEyebrow">MY ACCOUNT</span>
          <h1>Your profile.</h1>
          <p>Manage your personal information, learning identity and professional details.</p>
        </div>
        <button className="profileSaveTop" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </section>

      <section className="profileIdentityCard">
        <div className="avatarWrap">
          <div className="profileAvatar">
            {profile.avatar ? <img src={profile.avatar} alt="Profile" /> : initials}
          </div>
          <button className="avatarEdit" onClick={() => avatarInput.current?.click()} aria-label="Change profile picture">✎</button>
          <input ref={avatarInput} onChange={pickAvatar} type="file" accept="image/*" hidden />
        </div>
        <div className="identityCopy">
          <h2>{profile.name || "Your name"}</h2>
          <p>{profile.email || "Your email address"}</p>
          <button className="textButton" onClick={() => avatarInput.current?.click()}>Change photo</button>
        </div>
      </section>

      {message && <div className={message.includes("successfully") ? "profileNotice success" : "profileNotice"}>{message}</div>}

      <div className="profileGrid">
        <section className="profileCard profileMain">
          <div className="profileCardHead">
            <div><span>PERSONAL DETAILS</span><h2>About you</h2></div>
          </div>

          <div className="profileFields">
            <Field label="Full name" value={profile.name} onChange={v => update("name", v)} placeholder="Your full name" />
            <Field label="Email" value={profile.email} onChange={v => update("email", v)} placeholder="Email address" type="email" />
            <Field label="Phone" value={profile.phone} onChange={v => update("phone", v)} placeholder="+250 ..." />
            <Field label="Location" value={profile.location} onChange={v => update("location", v)} placeholder="Kigali, Rwanda" />
          </div>

          <label className="profileTextareaLabel">
            <span>Bio</span>
            <textarea value={profile.bio} onChange={e => update("bio", e.target.value)} placeholder="Tell us a little about yourself..." />
          </label>
        </section>

        <section className="profileCard profileSide">
          <div className="profileCardHead">
            <div><span>CAREER</span><h2>Professional profile</h2></div>
          </div>

          <label className="profileTextareaLabel compact">
            <span>Education</span>
            <textarea value={profile.education} onChange={e => update("education", e.target.value)} placeholder="School, university or qualifications" />
          </label>

          <label className="profileTextareaLabel compact">
            <span>Skills</span>
            <textarea value={profile.skills} onChange={e => update("skills", e.target.value)} placeholder="Example: Research, coding, design..." />
          </label>
        </section>
      </div>

      <section className="profileCard documentsCard">
        <div className="profileCardHead">
          <div><span>DOCUMENTS</span><h2>CV & files</h2></div>
        </div>
        <div className="documentRow">
          <div className="documentIcon">📄</div>
          <div className="documentInfo">
            <strong>{profile.cvName || "Your CV"}</strong>
            <p>{profile.cvName ? "Selected and ready to save" : "Upload your CV to your profile"}</p>
          </div>
          <button className="textButton" onClick={() => cvInput.current?.click()}>
            {profile.cvName ? "Change" : "Upload CV"}
          </button>
          <input ref={cvInput} onChange={pickCV} type="file" accept=".pdf,.doc,.docx" hidden />
        </div>
        <p className="documentNote">CV file storage can be connected to your cloud storage next. This dashboard already saves your CV file name and profile information.</p>
      </section>

      <div className="profileFooterActions">
        <button className="profileSave" onClick={save} disabled={saving}>
          {saving ? "Saving profile..." : "Save profile"}
        </button>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string
}) {
  return <label className="profileField">
    <span>{label}</span>
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  </label>;
}