import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const schema = z.object({ name: z.string().trim().min(1).max(60) });

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Give your Circle a name." }, { status: 400 });
  }

  const { data: circle, error } = await supabase
    .from("circles")
    .insert({ name: parsed.data.name, created_by: user.id })
    .select()
    .single();

  if (error || !circle) {
    return NextResponse.json({ error: "Could not create the Circle." }, { status: 400 });
  }

  const { error: memberError } = await supabase
    .from("circle_members")
    .insert({ circle_id: circle.id, user_id: user.id, role: "organiser" });

  if (memberError) {
    return NextResponse.json({ error: "Could not join your own Circle." }, { status: 400 });
  }

  return NextResponse.json(circle, { headers: { "Cache-Control": "no-store" } });
}
