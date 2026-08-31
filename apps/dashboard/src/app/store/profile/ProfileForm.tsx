"use client";

import { useState, useTransition } from "react";
import { updateStoreProfile } from "./actions";
import { t } from "@/lib/dictionary";
import { Card } from "@/components/ui";
import { TextField, TextAreaField, CheckboxRow, SubmitButton, FormResult } from "../_form/Fields";

export interface StoreProfileValues {
  name: string;
  tagline: string | null;
  description: string | null;
  city: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  offers_gift_wrap: boolean;
  pickup_address: string | null;
  driver_contact: string | null;
}

/**
 * One form, three cards. Grouped rather than one long scroll because on a
 * 375px screen the whole thing is a single column and the group headings are
 * the only thing telling you where you are in it.
 */
export function ProfileForm({ values }: { values: StoreProfileValues }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setResult(null);
          setResult(await updateStoreProfile(fd));
        })
      }
      className="space-y-4"
    >
      <Card title={t("profile.section.identity")}>
        <div className="space-y-4">
          <TextField label={t("profile.name")} name="name" defaultValue={values.name} required maxLength={120} />
          <TextField
            label={t("profile.tagline")}
            name="tagline"
            defaultValue={values.tagline}
            hint={t("profile.tagline.hint")}
            maxLength={160}
          />
          <TextAreaField
            label={t("profile.description")}
            name="description"
            defaultValue={values.description}
            rows={5}
            maxLength={2000}
          />
          <TextField label={t("profile.city")} name="city" defaultValue={values.city} maxLength={120} />
          <p className="text-xs text-muted">{t("profile.slug.locked")}</p>
        </div>
      </Card>

      <Card title={t("profile.section.images")}>
        <div className="space-y-4">
          <TextField
            label={t("profile.logo")}
            name="logo_url"
            defaultValue={values.logo_url}
            inputMode="url"
            placeholder="https://…"
          />
          <TextField
            label={t("profile.cover")}
            name="cover_image_url"
            defaultValue={values.cover_image_url}
            inputMode="url"
            placeholder="https://…"
          />
          <p className="text-xs text-muted">{t("profile.image.hint")}</p>
        </div>
      </Card>

      <Card title={t("profile.section.fulfilment")}>
        <div className="space-y-4">
          <CheckboxRow
            label={t("profile.giftwrap")}
            name="offers_gift_wrap"
            defaultChecked={values.offers_gift_wrap}
            hint={t("profile.giftwrap.hint")}
          />
          <TextAreaField
            label={t("profile.pickup")}
            name="pickup_address"
            defaultValue={values.pickup_address}
            hint={t("profile.pickup.hint")}
            rows={3}
            maxLength={500}
          />
          <TextField
            label={t("profile.driver")}
            name="driver_contact"
            defaultValue={values.driver_contact}
            type="tel"
            inputMode="tel"
            maxLength={60}
          />
        </div>
      </Card>

      {/*
        Sticky on phones: the form is taller than a screen, and a save button
        you have to scroll back to find is a save button that doesn't get
        pressed. It sits above the AppShell's own bottom bar.
      */}
      <div className="sticky bottom-2 z-10 space-y-2 rounded-card border border-line bg-surface/95 p-3 shadow-card backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
        <SubmitButton label={t("common.save")} pendingLabel={t("common.saving")} />
        <FormResult result={pending ? null : result} />
      </div>
    </form>
  );
}
