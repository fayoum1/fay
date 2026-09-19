import { SupabaseClient } from "@supabase/supabase-js";

export type RewardCampaignStats = {
  audience_count: number;
  audience_interaction_count: number;
  interaction_count: number;
  participant_count: number;
  pending_amount: number;
  approved_amount: number;
  pending_points: number;
  approved_points: number;
  current_entitlement: number;
  estimated_share: number | null;
};

const emptyStats = (): RewardCampaignStats => ({
  audience_count: 0,
  audience_interaction_count: 0,
  interaction_count: 0,
  participant_count: 0,
  pending_amount: 0,
  approved_amount: 0,
  pending_points: 0,
  approved_points: 0,
  current_entitlement: 0,
  estimated_share: null,
});

export async function getRewardCampaignStats(
  client: SupabaseClient,
  campaignIds: number[],
) {
  const stats = new Map<number, RewardCampaignStats>();
  if (!campaignIds.length) return stats;

  const [{ data: campaigns, error: campaignsError }, { data: rewards, error: rewardsError }] = await Promise.all([
    client
      .from("ad_reward_campaigns")
      .select("id,advertisement_id,reward_mode,budget,ad_reward_actions(id,reward_amount,enabled)")
      .in("id", campaignIds),
    client
      .from("ad_reward_ledger")
      .select("campaign_id,user_id,action_id,status,points,amount")
      .in("campaign_id", campaignIds)
      .in("status", ["pending", "approved"]),
  ]);
  if (campaignsError || rewardsError) {
    throw new Error(campaignsError?.message || rewardsError?.message);
  }

  const advertisementIds = [...new Set((campaigns || []).map((campaign) => campaign.advertisement_id))];
  const { data: engagements, error: engagementsError } = advertisementIds.length
    ? await client
        .from("advertisement_engagements")
        .select("advertisement_id,visitor_key")
        .in("advertisement_id", advertisementIds)
    : { data: [], error: null };
  if (engagementsError) throw new Error(engagementsError.message);

  for (const campaign of campaigns || []) {
    const campaignEngagements = (engagements || []).filter((engagement) => engagement.advertisement_id === campaign.advertisement_id);
    const campaignRewards = (rewards || []).filter((reward) => reward.campaign_id === campaign.id);
    const pooledActionIds = new Set(
      (campaign.ad_reward_actions || [])
        .filter((action) => action.enabled && Number(action.reward_amount) === 0)
        .map((action) => action.id),
    );
    const pooledRewards = campaign.reward_mode === "cash"
      ? campaignRewards.filter((reward) => pooledActionIds.has(reward.action_id))
      : [];
    const fixedRewards = campaignRewards.filter((reward) => !pooledActionIds.has(reward.action_id));
    const pendingRewards = campaignRewards.filter((reward) => reward.status === "pending");
    const approvedRewards = campaignRewards.filter((reward) => reward.status === "approved");
    const fixedAmount = fixedRewards.reduce((sum, reward) => sum + Number(reward.amount || 0), 0);
    const pooledAmount = pooledRewards.length ? Number(campaign.budget || 0) : 0;

    stats.set(campaign.id, {
      audience_count: new Set(campaignEngagements.map((engagement) => engagement.visitor_key)).size,
      audience_interaction_count: campaignEngagements.length,
      interaction_count: campaignRewards.length,
      participant_count: new Set(campaignEngagements.map((engagement) => engagement.visitor_key)).size,
      pending_amount: Number(pendingRewards.reduce((sum, reward) => sum + Number(reward.amount || 0), 0).toFixed(2)),
      approved_amount: Number(approvedRewards.reduce((sum, reward) => sum + Number(reward.amount || 0), 0).toFixed(2)),
      pending_points: pendingRewards.reduce((sum, reward) => sum + Number(reward.points || 0), 0),
      approved_points: approvedRewards.reduce((sum, reward) => sum + Number(reward.points || 0), 0),
      current_entitlement: Number((fixedAmount + pooledAmount).toFixed(2)),
      estimated_share: pooledRewards.length
        ? Number((Number(campaign.budget || 0) / pooledRewards.length).toFixed(2))
        : null,
    });
  }

  for (const campaignId of campaignIds) {
    if (!stats.has(campaignId)) stats.set(campaignId, emptyStats());
  }
  return stats;
}