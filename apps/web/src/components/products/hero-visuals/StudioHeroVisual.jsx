import HeroWindow from "./HeroWindow";
import styles from "./HeroVisual.module.css";

const shots = [
  { id: "S1", name: "Hero product reveal", length: "6s", scene: "dusk", state: "done" },
  { id: "S2", name: "Founder walk-in", length: "8s", scene: "studio", state: "live" },
  { id: "S3", name: "Packaging macro", length: "4s", scene: "macro", state: "queued" },
  { id: "S4", name: "City end card", length: "6s", scene: "city", state: "queued" },
];

const routing = [
  { id: "S1", model: "Veo 3.1", state: "Approved", tone: "done" },
  { id: "S2", model: "Runway Gen-4.5", state: "Rendering", tone: "live" },
  { id: "S3", model: "Seedance 2.0", state: "Queued", tone: "queued" },
  { id: "S4", model: "Kling 3.0", state: "Queued", tone: "queued" },
];

const videoClips = [18, 24, 12, 18, 14];
const voiceClips = [30, 8, 36];

export default function StudioHeroVisual() {
  return (
    <HeroWindow
      title="Brand launch film · Storyboard"
      meta={
        <>
          <span className={styles.metaPill}>30s</span>
          <span className={styles.metaPill}>9:16 · 1080p</span>
        </>
      }
    >
      <div className={styles.studioGrid}>
        <div className={styles.studioMain}>
          <div className={styles.panelHead}>
            <span>Shots</span>
            <span className={styles.muted}>4 scenes · character lock on</span>
          </div>

          <div className={styles.shots}>
            {shots.map((shot) => (
              <div key={shot.id} className={styles.shot}>
                <div className={`${styles.frame} ${styles[`scene_${shot.scene}`]}`}>
                  <span className={styles.frameSubject} />
                  {shot.state === "live" && <span className={styles.frameScan} />}
                  <span className={styles.frameTag}>
                    {shot.id} · {shot.length}
                  </span>
                </div>
                <div className={styles.shotMeta}>
                  <span className={`${styles.dot} ${styles[`tone_${shot.state}`]}`} />
                  <span className={styles.shotName}>{shot.name}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.timeline}>
            <div className={styles.ruler}>
              {["0:00", "0:06", "0:12", "0:18", "0:24", "0:30"].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className={styles.track}>
              <span className={styles.trackLabel}>Video</span>
              <div className={styles.trackLane}>
                {videoClips.map((w, i) => (
                  <span key={i} className={`${styles.clip} ${styles.clipVideo}`} style={{ flexGrow: w }} />
                ))}
              </div>
            </div>
            <div className={styles.track}>
              <span className={styles.trackLabel}>Voice</span>
              <div className={styles.trackLane}>
                {voiceClips.map((w, i) => (
                  <span key={i} className={`${styles.clip} ${styles.clipVoice}`} style={{ flexGrow: w }} />
                ))}
              </div>
            </div>
            <div className={styles.track}>
              <span className={styles.trackLabel}>Music</span>
              <div className={styles.trackLane}>
                <span className={`${styles.clip} ${styles.clipMusic}`} style={{ flexGrow: 1 }} />
              </div>
            </div>
            <span className={styles.playhead} />
          </div>
        </div>

        <aside className={styles.studioSide}>
          <div className={styles.panelHead}>
            <span>Model routing</span>
          </div>
          <ul className={styles.routeList}>
            {routing.map((row) => (
              <li key={row.id} className={styles.routeRow}>
                <span className={styles.routeId}>{row.id}</span>
                <span className={styles.routeModel}>{row.model}</span>
                <span className={`${styles.chip} ${styles[`chip_${row.tone}`]}`}>{row.state}</span>
              </li>
            ))}
          </ul>

          <div className={styles.render}>
            <div className={styles.renderHead}>
              <span>Rendering final cut</span>
              <span className={styles.muted}>72%</span>
            </div>
            <div className={styles.progress}>
              <span className={styles.progressFill} />
            </div>
            <div className={styles.renderFoot}>
              <span>Captions · Voice · Music</span>
              <span>H.264 / AAC</span>
            </div>
          </div>
        </aside>
      </div>
    </HeroWindow>
  );
}
