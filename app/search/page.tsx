"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormationCard from "@/components/FormationCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

export default function SearchPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);

    const response = await fetch(`/api/search?q=${search}`);
    const data = await response.json();

    setLoading(false);
    setResults(data.formations);
  };

  return (
    <div className="container md:w-[30vw] mx-auto">
      <form onSubmit={handleSearch} className="flex flex-col gap-2">
        <Label htmlFor="name" className="text-2xl">
          Search
        </Label>
        <Input
          id="name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, tag or hero"
        />
        <Button type="submit">Search</Button>
      </form>

      <Separator className="my-4" />

      {loading && <p>Loading...</p>}
      <ScrollArea className="mt-4 h-[73vh] px-4">
        {results.map((result: any) => (
          <FormationCard
            key={result.id.toString()!}
            data={result as any}
            className="mb-4"
          />
        ))}
      </ScrollArea>
    </div>
  );
}
