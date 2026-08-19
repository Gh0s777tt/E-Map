"use client";

import {
  deleteServiceTask,
  latestOdometers,
  listServiceTasks,
  markServiceDone,
  type ServiceTask,
  saveServiceTask,
} from "@e-logistic/api";
import { serviceStatus } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { useToast } from "@/components/Toast";
import { Badge, Button, PageHeader, SetupNotice } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { queryErrorMessage } from "@/lib/queryError";
import { queryKeys } from "@/lib/queryKeys";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

export default function ServicePage() {
  const t = useT();
  const PRESETS = [
    t("service.presetOil"),
    t("service.presetTires"),
    t("service.presetFilters"),
    t("service.presetPads"),
    t("service.presetGeneral"),
  ];
  const { vehicles, source } = useFleet();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [name, setName] = useState("");
  const [intervalKm, setIntervalKm] = useState("");
  const [intervalMonths, setIntervalMonths] = useState("");
  const [lastDoneKm, setLastDoneKm] = useState("");
  const [lastDoneDate, setLastDoneDate] = useState("");
  const toast = useToast();

  // #310 (fala 2): plan serwisowy i przebiegi przez TanStack Query. Rozdzielone na dwa
  // zapytania, bo mają różne cykle życia — zadania zmienia ta strona, przebiegi rosną
  // od tankowań kierowców — ale oba i tak muszą zniknąć z cache przy zmianie firmy.
  const membership = useQuery({
    queryKey: queryKeys.membership(),
    queryFn: () => getCachedMembership(getBrowserSupabase()),
  });
  const companyId = membership.data?.companyId ?? null;
  const canManage = membership.data?.role === "owner" || membership.data?.role === "dispatcher";

  const tasksQuery = useQuery({
    queryKey: queryKeys.serviceTasks(companyId),
    // Bez firmy pusta lista, a nie błąd — tak zachowywał się dawny `load()`.
    queryFn: (): Promise<ServiceTask[]> =>
      companyId ? listServiceTasks(getBrowserSupabase(), companyId) : Promise.resolve([]),
    enabled: !membership.isPending,
  });
  const odoQuery = useQuery({
    queryKey: queryKeys.odometers(companyId),
    queryFn: (): Promise<Record<string, number>> =>
      companyId ? latestOdometers(getBrowserSupabase(), companyId) : Promise.resolve({}),
    enabled: !membership.isPending,
  });
  const tasks = tasksQuery.data ?? [];
  const odo = odoQuery.data ?? {};
  const loading = membership.isPending || tasksQuery.isPending || odoQuery.isPending;
  const loadErr = queryErrorMessage(
    membership.error ?? tasksQuery.error ?? odoQuery.error,
    t("service.loadError"),
  );

  /**
   * Odświeżenie po zapisie/odhaczeniu/usunięciu. Przebiegi też — status zadania liczy się
   * z licznika, a ten mógł urosnąć od wejścia na stronę (dawny `load()` czytał oba naraz).
   */
  const reload = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.serviceTasks(companyId) }),
      qc.invalidateQueries({ queryKey: queryKeys.odometers(companyId) }),
    ]);
  }, [qc, companyId]);
  /** „Ponów": błąd mógł pochodzić z odczytu członkostwa, więc ponawiamy wszystkie trzy. */
  const retry = () => {
    void membership.refetch();
    void tasksQuery.refetch();
    void odoQuery.refetch();
  };

  useEffect(() => {
    if (!vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  const regOf = (id: string) => vehicles.find((v) => v.id === id)?.registration ?? id.slice(0, 8);

  function resetForm() {
    setEditingId(null);
    setName("");
    setIntervalKm("");
    setIntervalMonths("");
    setLastDoneKm("");
    setLastDoneDate("");
  }

  function startEdit(tk: ServiceTask) {
    setEditingId(tk.id);
    setVehicleId(tk.vehicle_id);
    setName(tk.name);
    setIntervalKm(tk.interval_km != null ? String(tk.interval_km) : "");
    setIntervalMonths(tk.interval_months != null ? String(tk.interval_months) : "");
    setLastDoneKm(tk.last_done_km != null ? String(tk.last_done_km) : "");
    setLastDoneDate(tk.last_done_date ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!vehicleId || !name.trim()) {
      toast(t("service.nameRequired"), "error");
      return;
    }
    if (!companyId) {
      toast(t("service.noCompany"), "error");
      return;
    }
    try {
      await saveServiceTask(
        getBrowserSupabase(),
        companyId,
        {
          vehicleId,
          name: name.trim(),
          intervalKm: intervalKm ? Number(intervalKm) : null,
          intervalMonths: intervalMonths ? Number(intervalMonths) : null,
          lastDoneKm: lastDoneKm ? Number(lastDoneKm) : null,
          lastDoneDate: lastDoneDate || null,
        },
        editingId ?? undefined,
      );
      toast(editingId ? t("service.updated") : t("service.taskAdded"), "success");
      resetForm();
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("service.saveError"), "error");
    }
  }

  async function done(tk: ServiceTask) {
    const km = odo[tk.vehicle_id] ?? null;
    if (
      !(await confirm(
        `${t("service.doneConfirmPrefix")}${tk.name}${t("service.doneConfirmMid")}${km ?? "—"}${t("service.doneConfirmSuffix")}`,
      ))
    )
      return;
    try {
      await markServiceDone(getBrowserSupabase(), tk.id, km, new Date().toISOString().slice(0, 10));
      toast(t("service.markedDone"), "success");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("common.error"), "error");
    }
  }

  async function remove(id: string) {
    if (!(await confirm(t("service.deleteConfirm")))) return;
    try {
      await deleteServiceTask(getBrowserSupabase(), id);
      if (editingId === id) resetForm();
      toast(t("service.deleted"), "success");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("service.deleteError"), "error");
    }
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader title={t("service.title")} subtitle={t("service.subtitle")} />

      <SetupNotice source={source} noVehicles={t("service.noVehicles")} />

      {canManage && (
        <div style={styles.form}>
          {editingId && (
            <div style={{ color: palette.red, fontWeight: 700 }}>{t("service.editingBanner")}</div>
          )}
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={f.label}>{t("form.field.vehicle")}</span>
              <select
                style={f.input}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={f.label}>{t("service.fieldTask")}</span>
              <input
                style={f.input}
                list="svc-presets"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("service.taskPlaceholder")}
              />
              <datalist id="svc-presets">
                {PRESETS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
          </div>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={f.label}>{t("service.fieldIntervalKm")}</span>
              <input
                style={f.input}
                type="number"
                value={intervalKm}
                onChange={(e) => setIntervalKm(e.target.value)}
                placeholder={t("service.intervalKmPlaceholder")}
              />
            </label>
            <label style={styles.field}>
              <span style={f.label}>{t("service.fieldIntervalMonths")}</span>
              <input
                style={f.input}
                type="number"
                value={intervalMonths}
                onChange={(e) => setIntervalMonths(e.target.value)}
                placeholder={t("service.intervalMonthsPlaceholder")}
              />
            </label>
          </div>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={f.label}>{t("service.fieldLastKm")}</span>
              <input
                style={f.input}
                type="number"
                value={lastDoneKm}
                onChange={(e) => setLastDoneKm(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={f.label}>{t("service.fieldLastDate")}</span>
              <input
                style={f.input}
                type="date"
                value={lastDoneDate}
                onChange={(e) => setLastDoneDate(e.target.value)}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={save}>{editingId ? t("common.save") : t("service.addTask")}</Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                {t("common.cancel")}
              </Button>
            )}
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28 }}>{t("service.tasksHeading")}</h2>
      <ListStatus
        loading={loading}
        error={loadErr}
        empty={tasks.length === 0}
        emptyText={t("service.empty")}
        onRetry={retry}
      />
      {!loading && !loadErr && tasks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {tasks.map((tk) => {
            const st = serviceStatus(odo[tk.vehicle_id] ?? null, tk.last_done_km, tk.interval_km);
            const color =
              st.level === "expired" ? palette.red : st.level === "soon" ? "#f59e0b" : "#22c55e";
            return (
              <div key={tk.id} style={styles.row}>
                <strong style={{ minWidth: 90 }}>{regOf(tk.vehicle_id)}</strong>
                <span style={{ flex: 1 }}>{tk.name}</span>
                {tk.interval_km != null && (
                  <Badge color={color}>
                    {st.kmLeft == null
                      ? `${t("service.everyPrefix")}${tk.interval_km}${t("service.kmSuffix")}`
                      : st.kmLeft < 0
                        ? `${t("service.overduePrefix")}${-st.kmLeft}${t("service.kmSuffix")}`
                        : `${t("service.leftPrefix")}${st.kmLeft}${t("service.kmSuffix")}`}
                  </Badge>
                )}
                {tk.interval_months != null && (
                  <span style={styles.dim}>
                    {t("service.everyPrefix")}
                    {tk.interval_months}
                    {t("service.monthsSuffix")}
                  </span>
                )}
                {canManage && (
                  <>
                    <Button variant="ghost" onClick={() => done(tk)}>
                      {t("service.markDone")}
                    </Button>
                    <Button variant="ghost" onClick={() => startEdit(tk)}>
                      ✏️
                    </Button>
                    <Button variant="danger" onClick={() => remove(tk.id)}>
                      🗑️
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 12, marginTop: 16, maxWidth: 620 },
  grid: { display: "flex", gap: 12, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 },
  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    fontSize: 14,
  },
  dim: { color: palette.smoke, fontSize: 13 },
};
