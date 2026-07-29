import { NextResponse } from "next/server";
import { REVIDAPI_VOICES } from "@9router/revidapi";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const lang = url.searchParams.get("lang");

    let voices = REVIDAPI_VOICES;
    if (lang) voices = voices.filter((v) => v.lang === lang);

    const data = voices.map((v) => ({
      id: v.id,
      name: v.name,
      lang: v.lang,
      gender: v.gender,
      model: `rv/edge/${v.id}`,
    }));

    return NextResponse.json({ object: "list", data });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 502 });
  }
}
