import { SupabaseClient } from "@supabase/supabase-js";

type CampaignAction = {
  id: number;
  reward_amount: number;
};

export async function settleRewardCampaign(
  client: SupabaseClient,
  campaignId: number,
) {
  const { data: campaign, error: campaignError } = await client
    .from("ad_reward_campaigns")
    .select("id,reward_mode,budget,ad_reward_actions(id,reward_amount)")
    .eq("id", campaignId)
    .single();
  if (campaignError) throw new Error(campaignError.message);

  const actions = (campaign.ad_reward_actions || []) as CampaignAction[];
  const pooledActionIds = actions
    .filter((action) => Number(action.reward_amount) === 0)
    .map((action) => action.id);
  if (
    campaign.reward_mode !== "cash" ||
    Number(campaign.budget) <= 0 ||
    pooledActionIds.length === 0
  ) {
    return { settled: false, participantCount: 0, amount: 0 };
  }

  const { data: rewards, error: rewardsError } = await client
    .from("ad_reward_ledger")
    .select("id")
    .eq("campaign_id", campaignId)
    .in("action_id", pooledActionIds)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (rewardsError) throw new Error(rewardsError.message);
  if (!rewards?.length)
    return { settled: true, participantCount: 0, amount: 0 };

  const budgetCents = Math.round(Number(campaign.budget) * 100);
  const baseShareCents = Math.floor(budgetCents / rewards.length);
  const remainderCents = budgetCents % rewards.length;

  for (const [index, reward] of rewards.entries()) {
    const amount =
      (baseShareCents + (index < remainderCents ? 1 : 0)) / 100;
    const { error } = await client
      .from("ad_reward_ledger")
      .update({ amount })
      .eq("id", reward.id);
    if (error) throw new Error(error.message);
  }

  return {
    settled: true,
    participantCount: rewards.length,
    amount: baseShareCents / 100,
  };
}

export async function settleExpiredRewardCampaigns(client: SupabaseClient) {
  const { data: campaigns, error } = await client
    .from("ad_reward_campaigns")
    .select("id")
    .eq("status", "active")
    .not("ends_at", "is", null)
    .lte("ends_at", new Date().toISOString());
  if (error) throw new Error(error.message);

  for (const campaign of campaigns || []) {
    await settleRewardCampaign(client, campaign.id);
    const { error: updateError } = await client
      .from("ad_reward_campaigns")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", campaign.id)
      .eq("status", "active");
    if (updateError) throw new Error(updateError.message);
  }
}