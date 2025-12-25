import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "../db";

export const webhookRoutes = new Hono()
  // GitHub webhook handler
  .post("/github", async (c) => {
    // 1. Verify webhook signature
    const signature = c.req.header("X-Hub-Signature-256");
    const payload = await c.req.text();

    if (!verifyWebhookSignature(payload, signature)) {
      console.error("Webhook signature verification failed");
      return c.json({ error: "Invalid signature" }, 401);
    }

    const event = c.req.header("X-GitHub-Event");
    const data = JSON.parse(payload);

    console.log(`Received GitHub webhook: ${event}, action: ${data.action}`);

    // 2. Handle pull_request events
    if (event === "pull_request") {
      console.log(`PR #${data.pull_request?.number}: merged=${data.pull_request?.merged}, merged_at=${data.pull_request?.merged_at}`);

      if (data.action === "closed" && data.pull_request.merged) {
        console.log("-> Calling handlePRMerged");
        await handlePRMerged(data.pull_request);
      } else if (data.action === "closed" && !data.pull_request.merged) {
        console.log("-> Calling handlePRClosed (not merged)");
        await handlePRClosed(data.pull_request);
      }
    }

    return c.json({ ok: true }, 200);
  });

/**
 * Handle PR merged event - update Element.currentValue with new values
 */
async function handlePRMerged(pr: {
  number: number;
  base: { repo: { full_name: string } };
}) {
  console.log(`Processing merged PR #${pr.number} for ${pr.base.repo.full_name}`);

  // 1. Find PullRequest record by repo + PR number
  const pullRequest = await prisma.pullRequest.findFirst({
    where: {
      githubPrNumber: pr.number,
      project: { githubRepo: pr.base.repo.full_name },
      status: "open",
    },
    include: {
      edits: true,
    },
  });

  if (!pullRequest) {
    console.log(`No matching open PullRequest found for PR #${pr.number}`);
    return;
  }

  console.log(`Found PullRequest ${pullRequest.id} with ${pullRequest.edits.length} edits`);

  // 2. Update PullRequest status
  await prisma.pullRequest.update({
    where: { id: pullRequest.id },
    data: { status: "merged", mergedAt: new Date() },
  });

  // 3. Update each Edit and its Element
  for (const edit of pullRequest.edits) {
    console.log(`Updating Element ${edit.elementId}: currentValue = "${edit.newValue}", newHref = "${edit.newHref}"`);

    // Build element update data
    const elementUpdateData: { currentValue: string; schema?: any } = {
      currentValue: edit.newValue,
    };

    // If href was changed, update the schema.href as well
    if (edit.newHref) {
      // Get the current element to merge schema
      const currentElement = await prisma.element.findUnique({
        where: { id: edit.elementId },
        select: { schema: true },
      });

      const currentSchema = (currentElement?.schema as Record<string, unknown>) || {};
      elementUpdateData.schema = {
        ...currentSchema,
        href: edit.newHref,
      };
      console.log(`  Also updating schema.href to "${edit.newHref}"`);
    }

    await prisma.$transaction([
      prisma.edit.update({
        where: { id: edit.id },
        data: { status: "approved" },
      }),
      prisma.element.update({
        where: { id: edit.elementId },
        data: elementUpdateData,
      }),
    ]);
    console.log(`Element ${edit.elementId} updated successfully`);
  }

  console.log(`Successfully processed merged PR #${pr.number}`);
}

/**
 * Handle PR closed (without merge) event - just update status
 */
async function handlePRClosed(pr: {
  number: number;
  base: { repo: { full_name: string } };
}) {
  console.log(`Processing closed PR #${pr.number} for ${pr.base.repo.full_name}`);

  const pullRequest = await prisma.pullRequest.findFirst({
    where: {
      githubPrNumber: pr.number,
      project: { githubRepo: pr.base.repo.full_name },
      status: "open",
    },
    include: {
      edits: true,
    },
  });

  if (!pullRequest) {
    console.log(`No matching open PullRequest found for PR #${pr.number}`);
    return;
  }

  // Update PullRequest status to closed
  await prisma.pullRequest.update({
    where: { id: pullRequest.id },
    data: { status: "closed" },
  });

  // Update edits to rejected status
  for (const edit of pullRequest.edits) {
    await prisma.edit.update({
      where: { id: edit.id },
      data: { status: "rejected" },
    });
  }

  console.log(`Successfully processed closed PR #${pr.number}`);
}

/**
 * Verify GitHub webhook signature using HMAC-SHA256
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | undefined
): boolean {
  if (!signature) {
    console.error("No signature provided");
    return false;
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET not configured");
    return false;
  }

  const expected =
    "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
