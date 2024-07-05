"use server";

import FormationCard from "@/components/FormationCard";
import { getCmsData } from "@/lib/server/cms-data";
import { getFormation } from "@/lib/server/formations";

export default async function FormationPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const formation = await getFormation(id);

  if (!formation) {
    return (
      <div className="container md:w-[40vw] text-center">
        <h1 className="text-2xl font-bold">Formation not found</h1>
        <p>Check the URL</p>
      </div>
    );
  }

  const cmsData = await getCmsData();

  return (
    <div className="container md:w-[40vw]">
      <FormationCard data={formation as any} cmsData={cmsData} />
    </div>
  );
}
