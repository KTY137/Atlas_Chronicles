import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({ children, className = "", variant = "default", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "danger" | "quiet" }) {
  return <button type="button" className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={`notice ${error ? "notice-error" : ""}`} role={error ? "alert" : "status"}>{children}</div>;
}
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-glyph" aria-hidden="true">✧</span><h2>{title}</h2><p>{children}</p>{action}</div>;
}
export function Loading({ text = "Wird geladen …" }: { text?: string }) {
  return <div className="loading" role="status"><span className="spinner" aria-hidden="true" />{text}</div>;
}
