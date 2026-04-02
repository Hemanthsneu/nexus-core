type ApprovalNotifyInput = {
  approvalId: string;
  sessionId: string;
  agentName: string;
  walletAddress: string;
  amount: number;
  destinationAddress: string;
  reason: string;
};

/**
 * Sends an Adaptive Card to a Microsoft Teams channel via an Incoming Webhook.
 * Set TEAMS_WEBHOOK_URL in .env.local to enable.
 */
export async function notifyApprovalRequired(input: ApprovalNotifyInput): Promise<void> {
  const teamsUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!teamsUrl) {
    return;
  }

  const shortWallet = `${input.walletAddress.slice(0, 6)}...${input.walletAddress.slice(-4)}`;
  const shortDest = `${input.destinationAddress.slice(0, 6)}...${input.destinationAddress.slice(-4)}`;
  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Teams Adaptive Card payload
  const payload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: '🛑 Agent Transaction Requires Approval',
              weight: 'Bolder',
              size: 'Medium',
              color: 'Attention',
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Agent', value: input.agentName },
                { title: 'Amount', value: `$${input.amount} USDC` },
                { title: 'Wallet', value: shortWallet },
                { title: 'Destination', value: shortDest },
              ],
            },
            {
              type: 'TextBlock',
              text: `**Hold reason:** ${input.reason}`,
              wrap: true,
              color: 'Attention',
            },
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'Review in Dashboard →',
              url: dashboardUrl,
              style: 'positive',
            },
          ],
          msteams: {
            width: 'Full',
          },
        },
      },
    ],
  };

  try {
    await fetch(teamsUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Notification failure is non-blocking — the hold is already persisted in the DB.
  }
}
