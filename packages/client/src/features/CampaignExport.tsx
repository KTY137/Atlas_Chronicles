// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Download } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { apiPath, ladeAlsDatei } from "../api";
import { useTask } from "../hooks";
import { t } from "../i18n";

export function CampaignExport({ campaignId }: { campaignId: string }) {
  const task = useTask();
  return <section className="panel"><h2>{t("Deine Kampagne mitnehmen")}</h2><p className="muted">{t("Exportiere die dauerhaften Kampagnendaten mit Historie, Karten, Regeln und Briefen als Chronicle-Datei.")}</p>
    {task.error ? <Notice error>{task.error}</Notice> : null}
    <Button disabled={task.busy} onClick={() => void task.run(() => ladeAlsDatei(apiPath(campaignId, "/export"), `campaign-${campaignId}.chronicle`,
      status => status === 404 ? t("Der Export ist für diesen Zugang nicht verfügbar.") : t("Der Export konnte nicht erstellt werden.")))}>
      <Download size={16} />{task.busy ? t("Export wird erstellt …") : t("Kampagne exportieren")}</Button>
  </section>;
}
