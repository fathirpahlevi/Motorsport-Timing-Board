    import React, { useState } from 'react';
    import { RiderResult } from '../types';
    import { createManualRider, ManualRiderInput } from '../data';

    interface AddRiderModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingRiders: RiderResult[];
    sessionId?: string;
    eventId?: string;
    onRiderAdded?: (newRider: RiderResult) => void;
    }

    export const AddRiderModal: React.FC<AddRiderModalProps> = ({
    isOpen,
    onClose,
    existingRiders,
    sessionId,
    eventId,
    onRiderAdded,
    }) => {
    const [formData, setFormData] = useState<ManualRiderInput>({
        nam: '',
        cb: '',
        no: '',
        tTm: '',
        btTm: '',
        ls: 1,
        cl: 'GCIC',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nam || !formData.no) return;

        setIsSubmitting(true);

        // 1. Build the full RiderResult object
        const newRider = createManualRider(
        {
            ...formData,
            sesId: sessionId,
            eId: eventId,
        },
        existingRiders
        );

        try {
        // 2. Persist to Backend API
        const res = await fetch('/api/manual-riders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRider),
        });

        if (!res.ok) {
            throw new Error(`Failed to save manual rider: ${res.statusText}`);
        }

        // 3. Local UI Optimistic Update
        if (onRiderAdded) {
            onRiderAdded(newRider);
        }

        // Reset & Close
        setFormData({ nam: '', cb: '', no: '', tTm: '', btTm: '', ls: 1, cl: 'GCIC' });
        onClose();
        } catch (err) {
        console.error('Error adding manual rider:', err);
        alert('Could not sync manual rider to server.');
        } finally {
        setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 text-white">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-blue-400 uppercase tracking-wider">
                + Add Manual Rider
            </h2>
            <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white font-bold text-xl"
            >
                ✕
            </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {/* Rider Name & Number */}
            <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    No. *
                </label>
                <input
                    type="text"
                    required
                    placeholder="57"
                    value={formData.no}
                    onChange={(e) => setFormData({ ...formData, no: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white font-mono focus:border-blue-500 outline-none"
                />
                </div>
                <div className="col-span-2">
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Rider Name *
                </label>
                <input
                    type="text"
                    required
                    placeholder="ALDI HENDRA"
                    value={formData.nam}
                    onChange={(e) => setFormData({ ...formData, nam: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                />
                </div>
            </div>

            {/* Team / Club Name */}
            <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Team / Club Name
                </label>
                <input
                type="text"
                placeholder="YAMAHA RACING TEAM"
                value={formData.cb}
                onChange={(e) => setFormData({ ...formData, cb: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Total Time
                </label>
                <input
                    type="text"
                    placeholder="5:25.610"
                    value={formData.tTm}
                    onChange={(e) => setFormData({ ...formData, tTm: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white font-mono focus:border-blue-500 outline-none"
                />
                </div>
                <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Best Lap Time
                </label>
                <input
                    type="text"
                    placeholder="1:04.344"
                    value={formData.btTm}
                    onChange={(e) => setFormData({ ...formData, btTm: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white font-mono focus:border-blue-500 outline-none"
                />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded font-semibold text-zinc-300"
                >
                Cancel
                </button>
                <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold text-white shadow-lg shadow-blue-900/50"
                >
                {isSubmitting ? 'Syncing...' : 'Add Rider'}
                </button>
            </div>
            </form>
        </div>
        </div>
    );
    };