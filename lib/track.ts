"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DiagnosisInputs } from "@/data/kasan-master";
import { DiagnosisResult } from "@/lib/engine";

// Supabase 未設定(環境変数なし)でも画面が動くように、全関数はベストエフォート。
// 失敗してもUIをブロックしない。

let client: SupabaseClient | null | undefined;

function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

export async function logDiagnosis(
  inputs: DiagnosisInputs,
  results: DiagnosisResult,
  source: string,
): Promise<string | null> {
  const db = supabase();
  if (!db) return null;
  try {
    const { data } = await db
      .from("diagnoses")
      .insert({
        inputs,
        results: {
          gotYen: results.gotYen,
          readyYen: results.readyYen,
          buildYen: results.buildYen,
          upgradeYen: results.upgradeYen,
          byKasan: results.items.map((i) => ({ id: i.kasan.id, status: i.status, monthlyYen: i.monthlyYen })),
        },
        source,
      })
      .select("id")
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function saveLead(email: string, wantsInterview: boolean, diagnosisId: string | null): Promise<boolean> {
  const db = supabase();
  if (!db) return false;
  try {
    const { error } = await db
      .from("leads")
      .insert({ email, wants_interview: wantsInterview, diagnosis_id: diagnosisId });
    return !error;
  } catch {
    return false;
  }
}

export async function saveFeedback(
  believable: number,
  wouldPay: string,
  comment: string,
  diagnosisId: string | null,
): Promise<boolean> {
  const db = supabase();
  if (!db) return false;
  try {
    const { error } = await db
      .from("feedback")
      .insert({ believable, would_pay: wouldPay, comment, diagnosis_id: diagnosisId });
    return !error;
  } catch {
    return false;
  }
}

export function isTrackingEnabled(): boolean {
  return supabase() !== null;
}
