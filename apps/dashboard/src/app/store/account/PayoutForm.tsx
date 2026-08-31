"use client";

import { useState, useTransition } from "react";
import { savePayoutDetails } from "./actions";
import { t } from "@/lib/dictionary";
import { TextField, RadioRows, SubmitButton, FormResult } from "../_form/Fields";

export interface PayoutValues {
  method: string;
  account_holder: string | null;
  account_number: string | null;
}

export function PayoutForm({ values }: { values: PayoutValues | null }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setResult(null);
          setResult(await savePayoutDetails(fd));
        })
      }
      className="space-y-4"
    >
      <div>
        <p className="mb-2 text-sm font-medium text-ink">{t("payout.method")}</p>
        <RadioRows
          name="method"
          defaultValue={values?.method ?? "cash"}
          options={[
            { value: "cash", label: t("payout.method.cash"), hint: t("payout.cash.hint") },
            { value: "whish", label: t("payout.method.whish") },
            { value: "bank", label: t("payout.method.bank") },
          ]}
        />
      </div>

      <TextField
        label={t("payout.holder")}
        name="account_holder"
        defaultValue={values?.account_holder}
        maxLength={160}
        autoComplete="off"
      />
      {/*
        autoComplete="off" and a plain text input on purpose: this is a payout
        destination the owner types once, not a card number, and browser
        autofill on a shared shop phone is the wrong default here.
      */}
      <TextField
        label={t("payout.number")}
        name="account_number"
        defaultValue={values?.account_number}
        maxLength={120}
        autoComplete="off"
      />

      <SubmitButton label={t("payout.save")} pendingLabel={t("common.saving")} />
      <FormResult result={pending ? null : result} />
    </form>
  );
}
