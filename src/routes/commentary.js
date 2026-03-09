import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";

export const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.get("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).json({
      error: "Invalid path parameters",
      details: parsedParams.error.flatten(),
    });
  }

  const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: parsedQuery.error.flatten(),
    });
  }

  const MAX_LIMIT = 100;
  const limit = Math.min(parsedQuery.data.limit ?? 100, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, parsedParams.data.id))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: "Commentary retrieved successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to list commentary",
      details: String(error),
    });
  }
});

commentaryRouter.post("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).json({
      error: "Invalid path parameters",
      details: parsedParams.error.flatten(),
    });
  }

  const parsedBody = createCommentarySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      error: "Invalid request payload",
      details: parsedBody.error.flatten(),
    });
  }

  try {
    const [entry] = await db
      .insert(commentary)
      .values({
        matchId: parsedParams.data.id,
        ...parsedBody.data,
      })
      .returning();


    if(res.app.locals.broadcastCommentary){
      res.app.locals.broadcastCommentary(entry.matchId,entry);
    }


    return res.status(201).json({
      success: true,
      message: "Commentary created successfully",
      data: entry,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create commentary",
      details: String(error),
    });
  }
});
