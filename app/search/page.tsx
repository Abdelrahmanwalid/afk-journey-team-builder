import Search from "@/components/Search";

export default async function SearchPage() {
  const cmsData = await (
    await fetch(
      `https://simplejsoncms.com/api/${process.env.NEXT_PUBLIC_SIMPLEJSONCMS_ID}`,
    )
  ).json();

  return <Search cmsData={cmsData} />;
}