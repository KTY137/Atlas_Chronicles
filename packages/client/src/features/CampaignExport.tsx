import { Download } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { apiPath, ladeAlsDatei } from "../api";
import { useTask } from "../hooks";

export function CampaignExport({ campaignId }: { campaignId: string }) {
  const task = useTask();
  return <section className="panel"><h2>Deine Kampagne mitnehmen</h2><p className="muted">Exportiere die dauerhaften Kampagnendaten mit Historie, Karten, Regeln und Briefen als Chronicle-Datei.</p>
    {task.error ? <Notice error>{task.error}</Notice> : null}
    <Button disabled={task.busy} onClick={() => void task.run(() => ladeAlsDatei(apiPath(campaignId, "/export"), `campaign-${campaignId}.chronicle`,
      status => status === 404 ? "Der Export ist für diesen Zugang nicht verfügbar." : "Der Export konnte nicht erstellt werden."))}>
      <Download size={16} />{task.busy ? "Export wird erstellt …" : "Kampagne exportieren"}</Button>
  </section>;
}
