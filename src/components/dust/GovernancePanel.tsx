"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  Vote, 
  ThumbsUp, 
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ProposalInfo, MembershipInfo } from "@/types/dustdao";
import { cn } from "@/lib/utils";

interface GovernancePanelProps {
  proposals: ProposalInfo[];
  membership: MembershipInfo | null;
  isVoting: boolean;
  onVote: (proposalId: string, voteFor: boolean) => void;
}

export function GovernancePanel({
  proposals,
  membership,
  isVoting,
  onVote,
}: GovernancePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const votingPower = membership ? Number(membership.lifetimeShares) / 1e6 : 0;

  // Separate active and past proposals
  const now = Date.now();
  const activeProposals = proposals.filter(p => p.isActive && p.endTimeMs > now);
  const pastProposals = proposals.filter(p => !p.isActive || p.endTimeMs <= now);

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Vote className="w-5 h-5 text-sui-purple" />
          Governance
        </h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-sui-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-sui-muted" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Voting Power */}
            <div className="p-4 bg-sui-purple/10 border border-sui-purple/30 rounded-xl mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-sui-muted">Your Voting Power</p>
                  <p className="font-bold text-xl text-sui-purple">
                    {votingPower.toFixed(2)}
                  </p>
                </div>
                <Vote className="w-8 h-8 text-sui-purple/50" />
              </div>
              <p className="text-xs text-sui-muted mt-2">
                Voting power = Lifetime shares contributed to DustDAO
              </p>
            </div>

            {/* Active Proposals */}
            {activeProposals.length > 0 ? (
              <div className="space-y-3 mb-6">
                <p className="text-sm font-medium text-sui-muted">Active Proposals</p>
                
                {activeProposals.map((proposal) => {
                  const totalVotes = Number(proposal.votesFor) + Number(proposal.votesAgainst);
                  const forPercent = totalVotes > 0 
                    ? (Number(proposal.votesFor) / totalVotes) * 100 
                    : 50;
                  const timeLeft = proposal.endTimeMs - now;
                  const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                  const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                  return (
                    <div 
                      key={proposal.objectId}
                      className="p-4 bg-sui-darker rounded-xl"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium">{proposal.title}</p>
                          <p className="text-xs text-sui-muted flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {daysLeft}d {hoursLeft}h remaining
                          </p>
                        </div>
                        {proposal.hasVoted && (
                          <span className="px-2 py-0.5 bg-sui-success/20 text-sui-success text-xs rounded-full">
                            Voted
                          </span>
                        )}
                      </div>

                      {/* Vote Bar */}
                      <div className="mb-3">
                        <div className="h-2 bg-sui-border rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-sui-success transition-all"
                            style={{ width: `${forPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-sui-success">
                            For: {(Number(proposal.votesFor) / 1e6).toFixed(2)}
                          </span>
                          <span className="text-sui-danger">
                            Against: {(Number(proposal.votesAgainst) / 1e6).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Vote Buttons */}
                      {!proposal.hasVoted && membership && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => onVote(proposal.objectId, true)}
                            disabled={isVoting || votingPower === 0}
                            className={cn(
                              "py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2",
                              !isVoting && votingPower > 0
                                ? "bg-sui-success/20 text-sui-success hover:bg-sui-success/30"
                                : "bg-sui-darker text-sui-muted cursor-not-allowed"
                            )}
                          >
                            {isVoting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ThumbsUp className="w-4 h-4" />
                            )}
                            <span>Vote For</span>
                          </button>

                          <button
                            onClick={() => onVote(proposal.objectId, false)}
                            disabled={isVoting || votingPower === 0}
                            className={cn(
                              "py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2",
                              !isVoting && votingPower > 0
                                ? "bg-sui-danger/20 text-sui-danger hover:bg-sui-danger/30"
                                : "bg-sui-darker text-sui-muted cursor-not-allowed"
                            )}
                          >
                            {isVoting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ThumbsDown className="w-4 h-4" />
                            )}
                            <span>Vote Against</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 mb-4">
                <Vote className="w-10 h-10 text-sui-muted mx-auto mb-3" />
                <p className="text-sui-muted">No active proposals</p>
                <p className="text-sm text-sui-muted mt-1">
                  Check back later for governance votes
                </p>
              </div>
            )}

            {/* Past Proposals */}
            {pastProposals.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-sui-muted">Past Proposals</p>
                
                {pastProposals.slice(0, 3).map((proposal) => {
                  const passed = proposal.votesFor > proposal.votesAgainst;
                  
                  return (
                    <div 
                      key={proposal.objectId}
                      className="p-3 bg-sui-darker/50 rounded-xl flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-sm">{proposal.title}</p>
                        <p className="text-xs text-sui-muted">
                          Ended {new Date(proposal.endTimeMs).toLocaleDateString()}
                        </p>
                      </div>
                      {passed ? (
                        <span className="flex items-center gap-1 text-sui-success text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          Passed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sui-danger text-sm">
                          <XCircle className="w-4 h-4" />
                          Failed
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
