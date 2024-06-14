"use server";

import { turso } from "@/lib/turso";
import { auth } from "@clerk/nextjs/server";

import FormationCard from "@/components/FormationCard";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default async function MyFormations() {
  const { userId } = auth();

  if (!userId) {
    auth().redirectToSignIn();
  }

  const response = await turso.execute({
    sql: "SELECT * FROM formations WHERE user_id = ?",
    args: [userId],
  });

  const data = response.rows;

  return (
    <>
      <ScrollArea className="h-[89vh] flex flex-col px-4">
        {data.map((formation) => (
          <FormationCard
            key={formation.id?.toString()}
            data={formation as any}
            className="mb-4"
            hideUser
            showDelete
          />
        ))}
      </ScrollArea>
    </>
  );
}
