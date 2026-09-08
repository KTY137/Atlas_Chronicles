// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Der Sprachzustand gehoert dem Client, die Paketrichtung bleibt `client -> ui`.
 *
 * Dieses Paket kennt weder Katalog noch gewaehlte Sprache; es laesst sich einen Uebersetzer
 * reichen. Ohne Registrierung ist jeder Text seine eigene Antwort — ein Baustein ohne
 * angeschlossenen Client bleibt damit vollstaendig deutsch statt leer.
 */
let uebersetzer: (text: string) => string = text => text;
export function registriereUebersetzer(fn: (text: string) => string): void { uebersetzer = fn; }
/** Absichtlich `t`: derselbe Name wie im Client, damit das Sprachgate die Stelle als
 * Literalschluessel erkennt und `packages/ui/src` mitpruefen kann. */
const t = (text: string) => uebersetzer(text);

export function Button({ children, className = "", variant = "default", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "danger" | "quiet" }) {
  return <button type="button" className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={`notice ${error ? "notice-error" : ""}`} role={error ? "alert" : "status"}>{children}</div>;
}
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-glyph" aria-hidden="true">✧</span><h2>{title}</h2><p>{children}</p>{action}</div>;
}
export function Loading({ text }: { text?: string }) {
  return <div className="loading" role="status"><span className="spinner" aria-hidden="true" />{text ?? t("Wird geladen …")}</div>;
}
