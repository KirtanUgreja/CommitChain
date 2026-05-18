export function getStatusLabel(
  status: number,
): "ACTIVE" | "COMPLETED" | "FAILED" {
  if (status === 1) return "COMPLETED";
  if (status === 2) return "FAILED";
  return "ACTIVE";
}

export function canVote(
  status: number,
  deadline: number,
  hasVoted: boolean,
): boolean {
  const deadlineMs = deadline * 1000;
  return status === 0 && Date.now() <= deadlineMs && !hasVoted;
}
