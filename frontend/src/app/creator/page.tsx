
'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, Campaign, Submission, money } from '../../lib/api';

type Earnings = {
    totalEarnings: number;
    totalViews: number;
    submissionsCount: number;
};

export default function CreatorPage() {
    const router = useRouter();

    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [earnings, setEarnings] = useState<Earnings>({
        totalEarnings: 0,
        totalViews: 0,
        submissionsCount: 0,
    });

    const [viewInputs, setViewInputs] = useState<Record<string, string>>({});
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [updateMessage, setUpdateMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const loadDashboard = useCallback(async () => {
        const [submissionData, earningsData] = await Promise.all([
            api<{ submissions: Submission[]; totalEarnings: number }>(
                '/submissions/mine'
            ),
            api<Earnings>('/earnings'),
        ]);

        setSubmissions(submissionData.submissions);
        setEarnings(earningsData);

        setViewInputs((previous) => {
            const next = { ...previous };

            for (const submission of submissionData.submissions) {
                next[submission._id] = String(submission.views);
            }

            return next;
        });
    }, []);

    useEffect(() => {
        if (!localStorage.getItem('memed_token')) {
            router.push('/login');
            return;
        }

        if (localStorage.getItem('memed_role') === 'brand') {
            router.push('/brand');
            return;
        }

        loadDashboard()
            .catch((err) =>
                setError(
                    err instanceof Error ? err.message : 'Could not load dashboard'
                )
            )
            .finally(() => setLoading(false));
    }, [router, loadDashboard]);

    async function handleUpdateViews(submission: Submission) {
        const rawViews = viewInputs[submission._id]?.trim();

        if (!rawViews || !/^\d+$/.test(rawViews)) {
            setError('Enter a valid non-negative whole number of views.');
            return;
        }

        const views = Number(rawViews);

        if (!Number.isSafeInteger(views)) {
            setError('View count is too large.');
            return;
        }

        if (views < submission.views) {
            setError('View count cannot be lower than the current count.');
            return;
        }

        setError('');
        setUpdateMessage('');
        setUpdatingId(submission._id);

        try {
            const result = await api<{
                allocatedNow: number;
                message?: string;
            }>(`/submissions/${submission._id}/views`, {
                method: 'PATCH',
                body: JSON.stringify({ views }),
            });

            await loadDashboard();

            setUpdateMessage(
                result.message ??
                `Views updated successfully. Additional payout: ${money(
                    result.allocatedNow
                )}.`
            );
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Could not update views.'
            );
        } finally {
            setUpdatingId(null);
        }
    }

    return (
        <div className="shell">
            <aside className="sidebar">
                <Link href="/" className="brand">
                    <span className="brand-mark">m</span> meme'd
                </Link>

                <div className="eyebrow">Workspace</div>

                <nav className="nav">
                    <Link className="active" href="/creator">
                        ▦ &nbsp; Overview
                    </Link>
                    <Link href="/campaigns">◉ &nbsp; Browse campaigns</Link>
                </nav>

                <div style={{ marginTop: 'auto' }}>
                    <button
                        className="button secondary"
                        style={{ width: '100%' }}
                        onClick={() => {
                            localStorage.clear();
                            router.push('/login');
                        }}
                    >
                        Log out
                    </button>
                </div>
            </aside>

            <main className="main">
                <div className="topbar">
                    <div>
                        <div className="eyebrow">Creator workspace</div>
                        <h1>Your creator dashboard</h1>
                        <p className="subtle">
                            Track your post views, milestones, and campaign earnings.
                        </p>
                    </div>

                    <Link href="/campaigns" className="button">
                        + Find campaigns
                    </Link>
                </div>

                {error && <div className="error">{error}</div>}

                {updateMessage && (
                    <div
                        className="card"
                        role="status"
                        style={{ marginBottom: 16, color: 'var(--purple)' }}
                    >
                        {updateMessage}
                    </div>
                )}

                <div className="stats">
                    <div className="card">
                        <div className="stat-label">Total earnings</div>
                        <div className="stat-value">
                            {money(earnings.totalEarnings)}
                        </div>
                    </div>

                    <div className="card">
                        <div className="stat-label">Total views</div>
                        <div className="stat-value">
                            {earnings.totalViews.toLocaleString('en-IN')}
                        </div>
                    </div>

                    <div className="card">
                        <div className="stat-label">Posts submitted</div>
                        <div className="stat-value">
                            {earnings.submissionsCount}
                        </div>
                    </div>

                    <div className="card">
                        <div className="stat-label">Campaigns available</div>
                        <div className="stat-value">Explore</div>
                        <Link
                            href="/campaigns"
                            style={{
                                fontSize: 12,
                                color: 'var(--purple)',
                                fontWeight: 700,
                            }}
                        >
                            Browse campaigns →
                        </Link>
                    </div>
                </div>

                <div className="section-head">
                    <h2>Your submissions</h2>
                    <span className="subtle">Views and payout progress</span>
                </div>

                {loading ? (
                    <p className="subtle">Loading submissions…</p>
                ) : submissions.length === 0 ? (
                    <div className="card">
                        <h3>Your first campaign is waiting</h3>
                        <p className="subtle">
                            Browse live campaigns and submit a post URL to start tracking
                            earnings.
                        </p>
                        <Link className="button" href="/campaigns">
                            Browse campaigns
                        </Link>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Campaign</th>
                                    <th>Post</th>
                                    <th>Views</th>
                                    <th>Current payout</th>
                                    <th>Status</th>
                                    <th>Update views</th>
                                </tr>
                            </thead>

                            <tbody>
                                {submissions.map((submission) => {
                                    const campaign =
                                        typeof submission.campaignId === 'object'
                                            ? (submission.campaignId as Campaign)
                                            : null;

                                    const isUpdating = updatingId === submission._id;

                                    return (
                                        <tr key={submission._id}>
                                            <td>
                                                <strong>{campaign?.name ?? 'Campaign'}</strong>
                                                <div className="subtle">
                                                    {campaign?.platform ?? ''}
                                                </div>
                                            </td>

                                            <td>
                                                <a
                                                    href={submission.postUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        color: 'var(--purple)',
                                                        maxWidth: 200,
                                                        display: 'block',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    Open post ↗
                                                </a>
                                            </td>

                                            <td>
                                                {submission.views.toLocaleString('en-IN')}
                                            </td>

                                            <td>
                                                <strong>{money(submission.payoutAllocated)}</strong>
                                            </td>

                                            <td>
                                                <span
                                                    className="platform"
                                                    style={
                                                        submission.status === 'budget_exhausted'
                                                            ? { background: '#fff0e1', color: '#a45a00' }
                                                            : {}
                                                    }
                                                >
                                                    {submission.status.replace('_', ' ')}
                                                </span>
                                            </td>

                                            <td>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 8,
                                                        minWidth: 145,
                                                    }}
                                                >
                                                    <input
                                                        type="number"
                                                        min={submission.views}
                                                        step={1}
                                                        value={viewInputs[submission._id] ?? ''}
                                                        disabled={isUpdating}
                                                        aria-label={`View count for ${campaign?.name ?? 'submission'}`}
                                                        onChange={(event) => {
                                                            setViewInputs((previous) => ({
                                                                ...previous,
                                                                [submission._id]: event.target.value,
                                                            }));
                                                            setError('');
                                                            setUpdateMessage('');
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '9px 10px',
                                                            border: '1px solid var(--border, #ddd)',
                                                            borderRadius: 8,
                                                            background: 'var(--card, white)',
                                                            color: 'inherit',
                                                        }}
                                                    />

                                                    <button
                                                        className="button"
                                                        disabled={isUpdating}
                                                        onClick={() => handleUpdateViews(submission)}
                                                    >
                                                        {isUpdating ? 'Updating…' : 'Update Views'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
