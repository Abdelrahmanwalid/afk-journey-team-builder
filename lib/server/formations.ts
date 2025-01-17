import "server-only";

import { revalidatePath, unstable_cache } from "next/cache";
import { auth } from "@clerk/nextjs/server";

import { type ClerkUser, getUser } from "@/lib/server/users";
import { type FormationData } from "@/lib/formations";
import { eq, sql, desc } from "drizzle-orm";
import { formations, votes, type FormationWithVotes } from "@/drizzle/schema";
import { drizzleClient } from "@/lib/server/drizzle";
import { heroNameToId } from "./cms-data";

const drizzle = drizzleClient;

export function buildFormationJson(
  formation: FormationWithVotes,
  user: ClerkUser,
): FormationData {
  return {
    ...formation,
    ...user,
  };
}

async function _getFormation(id: number): Promise<FormationData | false> {
  const formation = await drizzle.query.formations.findFirst({
    where: (formations, { eq }) => eq(formations.id, id),
    with: {
      votes: true,
    },
  });

  if (!formation) {
    return false;
  }

  const user = await getUser(formation.userId?.toString()!);

  return buildFormationJson(formation, user);
}

export const getFormation = unstable_cache(_getFormation, ["formations"], {
  revalidate: 3600,
  tags: ["formations"],
});

export async function getFormationsForUserId(
  userId: string,
): Promise<FormationData[]> {
  const userFormations = await drizzle.query.formations.findMany({
    where: (formations, { eq }) => eq(formations.userId, userId),
    with: {
      votes: true,
    },
  });

  return await Promise.all(
    userFormations.map(async (formation) => {
      const user = await getUser(formation.userId?.toString()!);

      return buildFormationJson(formation, user);
    }),
  );
}

export async function searchFormations(
  query?: string,
  rawTags?: string,
  rawCharacters?: string,
): Promise<FormationData[]> {
  const heroMap = await heroNameToId();

  const heroIds = rawCharacters
    ?.split(",")
    .map((x) => heroMap[x.toLowerCase()]);
  const tags = rawTags?.split(",");

  console.log(query, tags, heroIds);
  const queryResponse = await drizzle.query.formations.findMany({
    where: (formations, { like, and, or }) =>
      and(
        ...[
          query ? like(formations.name, `%${query}%`) : undefined,
          ...(tags ? tags.map((tag) => like(formations.tags, `%${tag}%`)) : []),
          ...(heroIds
            ? heroIds.map((id) =>
                or(
                  like(formations.formation, `%,${id},%`),
                  like(formations.formation, `${id},%`),
                  like(formations.formation, `%,${id}`),
                ),
              )
            : []),
        ],
      ),
    with: {
      votes: true,
    },
  });

  const searchFormations = await Promise.all(
    queryResponse.map(async (formation) => {
      let user;
      try {
        user = await getUser(formation.userId?.toString()!);
      } catch (e) {
        console.error(e);
        user = { user_id: "0", username: "Unknown", user_image: "" };
      }

      return buildFormationJson(formation, user);
    }),
  );

  return searchFormations;
}

async function _mostPopularFormations(limit: number): Promise<FormationData[]> {
  const rows = await drizzle
    .select({
      id: formations.id,
      name: formations.name,
      formation: formations.formation,
      artifact: formations.artifact,
      layout: formations.layout,
      userId: formations.userId,
      tags: formations.tags,
      formationShareId: formations.formationShareId,
    })
    .from(formations)
    .leftJoin(votes, eq(formations.id, votes.formationId))
    .orderBy(desc(sql<number>`COUNT(${votes.id})`))
    .groupBy(formations.id)
    .limit(limit);

  return await Promise.all(
    rows.map(async (formation) => {
      const user = await getUser(formation.userId?.toString()!);

      return buildFormationJson(formation, user);
    }),
  );
}

export const mostPopularFormations = unstable_cache(
  _mostPopularFormations,
  [],
  { revalidate: 3600, tags: ["most-popular-formations"] },
);

type FormationCreateData = {
  formation: string[];
  artifact: string;
  layout: string;
  name: string;
  tags: string[];
  formationShareId?: string;
};

export async function createFormation(
  formation: FormationCreateData,
): Promise<string | false> {
  const { userId } = auth();
  const values = {
    formation: formation.formation.join(","),
    artifact: formation.artifact,
    layout: parseInt(formation.layout),
    userId: userId!,
    name: formation.name,
    tags: formation.tags,
    formationShareId: formation.formationShareId,
  };
  const createResponse = await drizzle
    .insert(formations)
    .values(values)
    .returning({ id: formations.id })
    .execute();

  return createResponse ? createResponse[0].id.toString() : false;
}

export async function updateFormation(
  id: number,
  formation: FormationCreateData,
): Promise<void> {
  const { userId } = auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const formationData = await getFormation(id);
  if (!formationData) {
    throw new Error("Formation not found");
  }
  if (formationData.userId !== userId) {
    throw new Error("Unauthorized");
  }
  await drizzle
    .update(formations)
    .set({
      formation: formation.formation.join(","),
      artifact: formation.artifact,
      layout: parseInt(formation.layout),
      name: formation.name,
      tags: formation.tags,
      formationShareId: formation.formationShareId,
    })
    .where(eq(formations.id, id))
    .execute();

  revalidatePath(`/formations/${id}`);
  revalidatePath(`/search`);
}

export async function deleteFormation(id: number): Promise<void> {
  await drizzle.delete(formations).where(eq(formations.id, id)).execute();
}
