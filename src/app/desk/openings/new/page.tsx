import type { Metadata } from "next";
import { NewOpeningForm } from "@/components/desk/NewOpeningForm";

export const metadata: Metadata = { title: "New opening — Programming Desk" };

export default function NewOpeningPage() {
  return (
    <div>
      <h1>New opening</h1>
      <p>Step one of the opening workflow (brief §12). Upload and provider steps happen on the opening&rsquo;s own page next.</p>
      <NewOpeningForm />
    </div>
  );
}
