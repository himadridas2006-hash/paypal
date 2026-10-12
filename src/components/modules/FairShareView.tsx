'use client';

import React, { useState } from 'react';
import { FairShareItem, FairShareParticipant, FairShareBill } from '@/types';
import { generatePayPalPaymentLink } from '@/lib/paypal';

const INITIAL_DEFAULT_PARTICIPANTS: FairShareParticipant[] = [
  { name: 'You', paypalEmail: 'you@paypal.me', shareAmount: 43.67, paidStatus: 'paid' },
  { name: 'Mayukh', paypalEmail: 'mayukh@paypal.me', shareAmount: 43.67, paidStatus: 'unpaid' },
  { name: 'Soumya', paypalEmail: 'soumya@paypal.me', shareAmount: 26.66, paidStatus: 'unpaid' },
];

const INITIAL_DEFAULT_BILLS: FairShareBill[] = [
  {
    id: 'bill-1',
    billNumber: 'BILL-001',
    name: 'Artisan Bistro Dinner',
    date: 'Oct 12, 2026',
    total: 80.0,
    items: [
      { id: 'b1-item-1', name: 'Woodfired Truffle Pizza', price: 26.0, assignedTo: ['You', 'Mayukh', 'Soumya'] },
      { id: 'b1-item-2', name: 'Shared Wings & Fries', price: 18.5, assignedTo: ['You', 'Mayukh', 'Soumya'] },
      { id: 'b1-item-3', name: 'Craft IPA Beers', price: 19.5, assignedTo: ['Mayukh', 'Soumya'] },
      { id: 'b1-item-4', name: 'Specialty Mocktails', price: 16.0, assignedTo: ['You'] },
    ],
  },
  {
    id: 'bill-2',
    billNumber: 'BILL-002',
    name: 'City Rideshare & Airport Cab',
    date: 'Oct 12, 2026',
    total: 34.0,
    items: [
      { id: 'b2-item-1', name: 'Downtown to Venue Uber XL', price: 24.0, assignedTo: ['You', 'Mayukh'] },
      { id: 'b2-item-2', name: 'Bridge Toll & Airport Surcharge', price: 10.0, assignedTo: ['You', 'Mayukh'] },
    ],
  },
];

export const FairShareView: React.FC = () => {
  const [bills, setBills] = useState<FairShareBill[]>(INITIAL_DEFAULT_BILLS);
  const [activeBillId, setActiveBillId] = useState<string>('bill-1');
  const [participants, setParticipants] = useState<FairShareParticipant[]>(INITIAL_DEFAULT_PARTICIPANTS);
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // New Friend Form State
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);

  // New Item Form State (for active bill)
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number | ''>('');
  const [showAddItem, setShowAddItem] = useState(false);

  // New Bill Modal State
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [newBillName, setNewBillName] = useState('');

  // Active Bill Selector
  const activeBill = bills.find((b) => b.id === activeBillId) || bills[0] || null;

  // Aggregate Calculations
  const grandTotal = bills.reduce((acc, b) => acc + (Number(b.total) || 0), 0);
  const sumOfShares = participants.reduce((acc, p) => acc + (Number(p.shareAmount) || 0), 0);
  const mathIsExact = Math.abs(sumOfShares - grandTotal) < 0.05;

  // Generate Next Bill Number (e.g., BILL-003)
  const getNextBillNumber = () => {
    const existingNums = bills.map((b) => {
      const match = b.billNumber.match(/BILL-(\d+)/i);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    return `BILL-${String(maxNum + 1).padStart(3, '0')}`;
  };

  // Add a new blank bill
  const handleCreateBlankBill = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newBillName.trim() || 'Untitled Expense Bill';
    const newId = `bill-${Date.now()}`;
    const newBillNum = getNextBillNumber();

    const createdBill: FairShareBill = {
      id: newId,
      billNumber: newBillNum,
      name: cleanName,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      total: 0,
      items: [],
    };

    const updatedBills = [...bills, createdBill];
    setBills(updatedBills);
    setActiveBillId(newId);
    setNewBillName('');
    setShowAddBillModal(false);
  };

  // Delete a Bill
  const handleDeleteBill = (billIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (bills.length <= 1) {
      alert('You must have at least one active bill in FairShare.');
      return;
    }
    const updatedBills = bills.filter((b) => b.id !== billIdToDelete);
    setBills(updatedBills);
    if (activeBillId === billIdToDelete) {
      setActiveBillId(updatedBills[0].id);
    }
  };

  // Add a friend to the group
  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFriendName.trim();
    if (!cleanName) return;

    if (participants.some((p) => p.name.toLowerCase() === cleanName.toLowerCase())) {
      alert('A friend with this name is already in the group.');
      return;
    }

    const email = newFriendEmail.trim() || `${cleanName.toLowerCase().replace(/\s+/g, '')}@paypal.me`;
    const updatedParticipants = [
      ...participants,
      {
        name: cleanName,
        paypalEmail: email,
        shareAmount: 0.0,
        paidStatus: 'unpaid' as const,
      },
    ];

    setParticipants(updatedParticipants);
    setNewFriendName('');
    setNewFriendEmail('');
    setShowAddFriend(false);
  };

  // Remove a friend
  const handleRemoveFriend = (nameToRemove: string) => {
    if (nameToRemove === 'You') {
      alert('You cannot remove yourself from the expense group.');
      return;
    }
    if (participants.length <= 2) {
      alert('You need at least 2 participants to split expenses.');
      return;
    }

    const updated = participants.filter((p) => p.name !== nameToRemove);
    setParticipants(updated);

    // Also remove them from dish assignments across all bills
    setBills(
      bills.map((b) => ({
        ...b,
        items: b.items.map((it) => ({
          ...it,
          assignedTo: it.assignedTo.filter((n) => n !== nameToRemove),
        })),
      }))
    );
  };

  // Toggle friend assignment on a dish in the active bill
  const handleToggleFriendOnItem = (itemId: string, friendName: string) => {
    if (!activeBill) return;

    const updatedItems = activeBill.items.map((item) => {
      if (item.id === itemId) {
        const isAssigned = item.assignedTo.includes(friendName);
        const newAssigned = isAssigned
          ? item.assignedTo.filter((n) => n !== friendName)
          : [...item.assignedTo, friendName];
        return { ...item, assignedTo: newAssigned };
      }
      return item;
    });

    const updatedBills = bills.map((b) => (b.id === activeBill.id ? { ...b, items: updatedItems } : b));
    setBills(updatedBills);
  };

  // Add a custom item to the active bill
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBill) return;
    const cleanName = newItemName.trim();
    const priceNum = typeof newItemPrice === 'number' ? newItemPrice : parseFloat(String(newItemPrice));

    if (!cleanName || isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid item name and positive price.');
      return;
    }

    const newItem: FairShareItem = {
      id: `item-${Date.now()}`,
      name: cleanName,
      price: Math.round(priceNum * 100) / 100,
      assignedTo: participants.map((p) => p.name),
    };

    const updatedItems = [...activeBill.items, newItem];
    const newTotal = Math.round(updatedItems.reduce((acc, it) => acc + it.price, 0) * 100) / 100;

    const updatedBills = bills.map((b) =>
      b.id === activeBill.id ? { ...b, items: updatedItems, total: newTotal } : b
    );

    setBills(updatedBills);
    setNewItemName('');
    setNewItemPrice('');
    setShowAddItem(false);
  };

  // Delete an item from the active bill
  const handleDeleteItem = (itemId: string) => {
    if (!activeBill) return;
    const updatedItems = activeBill.items.filter((it) => it.id !== itemId);
    const newTotal = Math.round(updatedItems.reduce((acc, it) => acc + it.price, 0) * 100) / 100;

    const updatedBills = bills.map((b) =>
      b.id === activeBill.id ? { ...b, items: updatedItems, total: newTotal } : b
    );
    setBills(updatedBills);
  };

  // Toggle friend paid status
  const handleTogglePaidStatus = (name: string) => {
    setParticipants(
      participants.map((p) => {
        if (p.name === name) {
          const nextStatus = p.paidStatus === 'paid' ? 'unpaid' : 'paid';
          return { ...p, paidStatus: nextStatus };
        }
        return p;
      })
    );
  };

  // Calculate mathematically from item assignments directly without AI
  const calculateExactDishShares = () => {
    const shares: Record<string, number> = {};
    participants.forEach((p) => {
      shares[p.name] = 0;
    });

    bills.forEach((b) => {
      b.items.forEach((it) => {
        const assigned = it.assignedTo && it.assignedTo.length > 0 ? it.assignedTo : participants.map((p) => p.name);
        const validAssigned = assigned.filter((n) => shares[n] !== undefined);
        const divisor = validAssigned.length > 0 ? validAssigned.length : participants.length;
        const perPerson = Number(it.price) / divisor;

        const targets = validAssigned.length > 0 ? validAssigned : participants.map((p) => p.name);
        targets.forEach((n) => {
          if (shares[n] !== undefined) {
            shares[n] += perPerson;
          }
        });
      });
    });

    // Penny balancing
    const currentSum = Object.values(shares).reduce((a, b) => a + b, 0);
    const diff = Math.round((grandTotal - currentSum) * 100) / 100;
    if (Math.abs(diff) > 0.001 && participants.length > 0) {
      shares[participants[0].name] = Math.round((shares[participants[0].name] + diff) * 100) / 100;
    }

    setParticipants(
      participants.map((p) => ({
        ...p,
        shareAmount: Math.round((shares[p.name] || 0) * 100) / 100,
      }))
    );
    setAiExplanation(
      `Exact mathematical allocation derived directly from item assignments across ${bills.length} bills. Total reconciled to $${grandTotal.toFixed(2)}.`
    );
  };

  // Real Multimodal Receipt Scanning
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'new' | 'replace') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReceipt(true);
    const billLabel = mode === 'new' ? getNextBillNumber() : activeBill?.billNumber || 'BILL-001';
    setUploadStatus(`Scanning ${file.name} for ${billLabel} with Gemini AI...`);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        const res = await fetch('/api/ai/fairshare-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            fileName: file.name,
            fileType: file.type,
          }),
        });

        const data = await res.json();

        if (res.ok && data.items && data.items.length > 0) {
          const allFriendNames = participants.map((p) => p.name);
          const parsedItems: FairShareItem[] = data.items.map((it: any, index: number) => ({
            id: `scanned-${Date.now()}-${index}`,
            name: it.name || `Item #${index + 1}`,
            price: Number(it.price) || 0,
            assignedTo: allFriendNames,
          }));

          const extractedTotal =
            Number(data.total) || parsedItems.reduce((acc, it) => acc + it.price, 0);

          if (mode === 'new') {
            const newBillId = `bill-${Date.now()}`;
            const createdBill: FairShareBill = {
              id: newBillId,
              billNumber: billLabel,
              name: data.restaurant || file.name.replace(/\.[^/.]+$/, ''),
              date: data.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              total: Math.round(extractedTotal * 100) / 100,
              items: parsedItems,
              tax: data.tax,
              tip: data.tip,
            };

            setBills((prev) => [...prev, createdBill]);
            setActiveBillId(newBillId);
            setUploadStatus(`Successfully added ${billLabel}: ${createdBill.name} (${parsedItems.length} items parsed)`);
          } else if (activeBill) {
            const updatedBills = bills.map((b) =>
              b.id === activeBill.id
                ? {
                    ...b,
                    name: data.restaurant || b.name,
                    date: data.date || b.date,
                    total: Math.round(extractedTotal * 100) / 100,
                    items: parsedItems,
                    tax: data.tax,
                    tip: data.tip,
                  }
                : b
            );
            setBills(updatedBills);
            setUploadStatus(`Successfully updated ${activeBill.billNumber}: ${data.restaurant || activeBill.name}`);
          }
        } else {
          setUploadStatus('Could not parse items automatically. Check image clarity.');
        }
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('OCR Upload Error:', err);
      setUploadStatus('Scan failed. Please try again.');
    } finally {
      setIsUploadingReceipt(false);
      setTimeout(() => setUploadStatus(null), 5000);
      e.target.value = '';
    }
  };

  // Run AI Arbitration Across All Bills
  const handleArbitrate = async () => {
    setIsAnalyzing(true);
    setAiExplanation(null);

    try {
      const res = await fetch('/api/ai/arbitrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          bills,
          participants,
          total: grandTotal,
        }),
      });

      const data = await res.json();

      if (data.splits && Array.isArray(data.splits)) {
        const splitMap = new Map<string, number>();
        data.splits.forEach((s: any) => {
          splitMap.set(String(s.name).toLowerCase(), Number(s.share) || 0);
        });

        const updatedParticipants = participants.map((p) => {
          const matchKey = p.name.toLowerCase();
          const newShare = splitMap.has(matchKey) ? splitMap.get(matchKey)! : p.shareAmount;
          return {
            ...p,
            shareAmount: Math.round(newShare * 100) / 100,
          };
        });

        setParticipants(updatedParticipants);
        setAiExplanation(data.explanation || `Arbiter calculated balanced shares across all ${bills.length} bills.`);
      } else {
        alert('Arbitration completed with standard balanced split.');
      }
    } catch (e) {
      console.error('Arbitration failed:', e);
      alert('Arbitration connection failed. Please check network.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy PayPal payment link
  const copyPaymentLink = (participant: FairShareParticipant) => {
    const link = generatePayPalPaymentLink(participant.paypalEmail, participant.shareAmount, 'FairShare Group Outing');
    navigator.clipboard.writeText(link);
    setCopiedLink(participant.name);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto px-4 pb-16">
      {/* Header Banner - Responsive to Light/Dark/Forest Theme */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-6 md:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-surface text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              Multi-Bill Split Ledger & AI Arbiter
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight flex items-center gap-3">
              FairShare Expense Hub
            </h1>
            <p className="text-on-surface-variant text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              Add multiple bills with unique identifiers (e.g. <span className="font-mono font-bold text-secondary">BILL-001</span>, <span className="font-mono font-bold text-secondary">BILL-002</span>), customize friend dish assignments per bill, and let AI calculate one unified, accurate settlement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* New Bill Button */}
            <button
              onClick={() => setShowAddBillModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs transition-all shadow-sm active:scale-95 border border-outline-variant/30"
            >
              <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Add New Bill
            </button>

            {/* Scan New Bill (AI Vision) */}
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs transition-all shadow-md cursor-pointer active:scale-95">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{isUploadingReceipt ? 'Scanning Bill...' : 'Upload & Scan New Bill'}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={isUploadingReceipt}
                onChange={(e) => handleReceiptUpload(e, 'new')}
              />
            </label>
          </div>
        </div>

        {/* Upload feedback banner */}
        {uploadStatus && (
          <div className="mt-4 p-3 rounded-xl bg-secondary-container/40 border border-secondary/30 text-on-surface text-xs flex items-center gap-2 animate-in fade-in">
            <svg className="w-4 h-4 text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{uploadStatus}</span>
          </div>
        )}
      </div>

      {/* MULTI-BILL TABS STRIP */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Multi-Bill Registry</span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-surface font-mono text-[10px] font-bold">
              {bills.length} Bills Active
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-on-surface-variant mr-2">Combined All-Bills Total:</span>
            <span className="text-base font-extrabold text-on-surface font-mono">${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {bills.map((b) => {
            const isActive = b.id === activeBillId;
            return (
              <div
                key={b.id}
                onClick={() => setActiveBillId(b.id)}
                className={`group relative shrink-0 cursor-pointer rounded-xl p-3.5 border transition-all select-none min-w-[220px] ${
                  isActive
                    ? 'bg-surface-container-high border-primary/50 shadow-md ring-1 ring-primary/40'
                    : 'bg-surface-container-low hover:bg-surface-container border-outline-variant/30 text-on-surface-variant'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded ${
                      isActive ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'
                    }`}>
                      {b.billNumber}
                    </span>
                    <span className="text-xs font-medium text-on-surface-variant">{b.items.length} items</span>
                  </div>

                  {bills.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteBill(b.id, e)}
                      title="Delete Bill"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-error/10 rounded text-on-surface-variant hover:text-error transition-opacity"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="mt-2">
                  <div className={`text-sm font-semibold truncate ${isActive ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                    {b.name}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <span className="text-on-surface-variant text-[11px]">{b.date}</span>
                    <span className="font-mono font-bold text-tertiary">${Number(b.total || 0).toFixed(2)}</span>
                  </div>
                </div>

                {isActive && (
                  <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-primary rounded-full" />
                )}
              </div>
            );
          })}

          {/* Quick inline upload receipt as new bill */}
          <label className="shrink-0 flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-outline-variant hover:border-primary/60 bg-surface-container-low hover:bg-surface-container cursor-pointer transition-all min-w-[140px] text-on-surface-variant hover:text-on-surface group">
            <svg className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-semibold">+ Add Bill</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={isUploadingReceipt}
              onChange={(e) => handleReceiptUpload(e, 'new')}
            />
          </label>
        </div>
      </div>

      {/* FRIENDS MANAGER (Unified Across All Bills) */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                Friends in Expense Circle
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-mono font-medium">
                  {participants.length} Active
                </span>
              </h2>
              <p className="text-xs text-on-surface-variant">
                Friends can be assigned to dishes across all bills. AI divides costs accurately.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddFriend(!showAddFriend)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-secondary-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 text-xs font-semibold transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {showAddFriend ? 'Cancel' : '+ Add Friend'}
          </button>
        </div>

        {/* Add Friend Inline Form */}
        {showAddFriend && (
          <form onSubmit={handleAddFriend} className="mb-6 p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
            <div>
              <label className="block text-[11px] font-medium text-on-surface-variant mb-1">Friend Name *</label>
              <input
                type="text"
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                placeholder="e.g. Alex, Rahul, Dana"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-on-surface-variant mb-1">PayPal Email / Handle (Optional)</label>
              <input
                type="text"
                value={newFriendEmail}
                onChange={(e) => setNewFriendEmail(e.target.value)}
                placeholder="e.g. alex@paypal.me"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs py-2 px-4 rounded-lg transition-colors shadow-sm"
              >
                Save Friend to Circle
              </button>
            </div>
          </form>
        )}

        {/* Friends Pills List */}
        <div className="flex flex-wrap gap-2.5">
          {participants.map((friend) => (
            <div
              key={friend.name}
              className="group inline-flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-outline-variant transition-all shadow-sm"
            >
              <div className="w-6 h-6 rounded-full bg-primary text-on-primary font-bold text-[10px] flex items-center justify-center uppercase shadow-sm">
                {friend.name.slice(0, 2)}
              </div>
              <div>
                <div className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                  {friend.name}
                  {friend.name === 'You' && (
                    <span className="text-[10px] text-secondary font-normal">(Host)</span>
                  )}
                </div>
                <div className="text-[10px] text-on-surface-variant font-mono">{friend.paypalEmail}</div>
              </div>

              {friend.name !== 'You' && (
                <button
                  type="button"
                  onClick={() => handleRemoveFriend(friend.name)}
                  className="opacity-40 group-hover:opacity-100 hover:text-error text-on-surface-variant text-xs px-1 py-0.5 rounded transition-all"
                  title="Remove friend"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ACTIVE BILL INSPECTOR & DISH ASSIGNMENT */}
      {activeBill && (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-extrabold px-2.5 py-1 rounded-md bg-secondary-container text-on-surface border border-outline-variant/30">
                  {activeBill.billNumber}
                </span>
                <h2 className="text-xl font-bold text-on-surface tracking-tight">{activeBill.name}</h2>
              </div>
              <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-3">
                <span>Date: <strong className="text-on-surface">{activeBill.date}</strong></span>
                <span>•</span>
                <span>Items: <strong className="text-on-surface">{activeBill.items.length} dishes</strong></span>
                <span>•</span>
                <span>Bill Total: <strong className="text-tertiary font-mono text-sm">${activeBill.total.toFixed(2)}</strong></span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Replace/Scan this specific bill */}
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold cursor-pointer border border-outline-variant/30 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Re-scan This Bill</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  disabled={isUploadingReceipt}
                  onChange={(e) => handleReceiptUpload(e, 'replace')}
                />
              </label>

              {/* Add dish */}
              <button
                onClick={() => setShowAddItem(!showAddItem)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-sm transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>{showAddItem ? 'Cancel' : '+ Add Dish / Fee'}</span>
              </button>
            </div>
          </div>

          {/* Add Item Form */}
          {showAddItem && (
            <form onSubmit={handleAddItem} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
              <div>
                <label className="block text-[11px] font-medium text-on-surface-variant mb-1">Item / Dish Name *</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Garlic Bread, Delivery Tip, Red Wine"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-on-surface-variant mb-1">Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:border-primary font-mono"
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-tertiary hover:bg-tertiary/90 text-white font-semibold text-xs py-2 px-4 rounded-lg transition-colors shadow-sm"
                >
                  Add to {activeBill.billNumber}
                </button>
              </div>
            </form>
          )}

          {/* Dishes Table */}
          <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-outline-variant/30">
                <tr>
                  <th className="py-3 px-4">Dish / Expense Line</th>
                  <th className="py-3 px-4 w-28 text-right">Price</th>
                  <th className="py-3 px-4">Assigned Friends (Click to Toggle)</th>
                  <th className="py-3 px-4 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {activeBill.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-on-surface-variant">
                      No dishes in this bill yet. Click <strong>+ Add Dish / Fee</strong> or upload a receipt to auto-populate.
                    </td>
                  </tr>
                ) : (
                  activeBill.items.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-on-surface">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-tertiary">
                        ${Number(item.price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {participants.map((friend) => {
                            const isAssigned = item.assignedTo.includes(friend.name);
                            return (
                              <button
                                key={friend.name}
                                type="button"
                                onClick={() => handleToggleFriendOnItem(item.id, friend.name)}
                                className={'text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-all select-none ' + (
                                  isAssigned
                                    ? 'bg-primary text-on-primary shadow-sm'
                                    : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant border border-outline-variant/30'
                                )}
                              >
                                {friend.name}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-on-surface-variant hover:text-error p-1 rounded hover:bg-error/10 transition-colors"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI EXPENSE ARBITER SECTION */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              Multi-Bill AI Arbiter
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-tertiary/10 text-tertiary border border-tertiary/20 font-bold">
                Gemini Multi-Bill Engine
              </span>
            </h2>
            <p className="text-xs text-on-surface-variant">
              Provide natural language nuances across all {bills.length} bills (e.g. &quot;Mayukh paid for BILL-002, so credit him&quot; or &quot;in BILL-003 Sneha didn&apos;t drink Kingfisher&quot;).
            </p>
          </div>
        </div>

        {/* Arbiter Input */}
        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your nuances here... e.g.: Split BILL-001 by item assignments, but for BILL-002 only split between You and Mayukh. Exclude non-drinkers from beer costs."
            rows={3}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans"
          />

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-on-surface-variant font-medium">Quick Presets:</span>
            <button
              type="button"
              onClick={() => setPrompt('Split every bill strictly based on dish assignments per item.')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/30 transition-colors"
            >
              Strict Dish Assignments
            </button>
            <button
              type="button"
              onClick={() => setPrompt(`Divide the entire combined total of $${grandTotal.toFixed(2)} equally among all friends.`)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/30 transition-colors"
            >
              Equal Split Across All Bills
            </button>
            <button
              type="button"
              onClick={() => setPrompt('You cover 50% of the entire bill as the host, and the rest is divided equally among the other friends.')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/30 transition-colors"
            >
              Host Covers 50%
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-on-surface-variant">
              Total to resolve: <span className="font-mono font-bold text-tertiary">${grandTotal.toFixed(2)}</span> across <span className="text-on-surface font-semibold">{bills.length} bills</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Instant Dish Assignment Solver Button */}
              <button
                type="button"
                onClick={calculateExactDishShares}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs border border-outline-variant/30 transition-all active:scale-95 shadow-sm"
              >
                <svg className="w-3.5 h-3.5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Calculate from Dish Assignments</span>
              </button>

              {/* AI Arbiter Button */}
              <button
                onClick={handleArbitrate}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Arbitrating Cross-Bill Splits...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Arbitrate All Bills with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* AI Explanation Callout */}
        {aiExplanation && (
          <div className="p-4 rounded-xl bg-secondary-container/40 border border-secondary/30 text-xs text-on-surface animate-in fade-in space-y-1">
            <div className="font-bold flex items-center gap-2 text-on-surface">
              <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>AI Arbiter Reasoning & Breakdown:</span>
            </div>
            <p className="leading-relaxed text-on-surface-variant">{aiExplanation}</p>
          </div>
        )}
      </div>

      {/* MATHEMATICAL BALANCE CHECK BAR */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
        mathIsExact
          ? 'bg-tertiary/10 border-tertiary/30 text-tertiary font-medium'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-600 font-medium'
      }`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${mathIsExact ? 'bg-tertiary' : 'bg-amber-500 animate-ping'}`} />
          <span>
            {mathIsExact
              ? 'Mathematical Reconciliation Exact: 100% of all bills accounted for down to the cent.'
              : `Discrepancy Detected: Combined Bills = $${grandTotal.toFixed(2)}, Current Shares = $${sumOfShares.toFixed(2)}. Click Arbitrate to balance.`}
          </span>
        </div>
        <div className="font-mono text-xs font-bold shrink-0">
          Bills Total: ${grandTotal.toFixed(2)} | Shares Total: ${sumOfShares.toFixed(2)}
        </div>
      </div>

      {/* CONSOLIDATED MASTER SETTLEMENT CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-on-surface tracking-tight">Consolidated Settlement Ledger</h2>
            <p className="text-xs text-on-surface-variant">
              Each friend settles their entire combined balance for all {bills.length} bills in one single transaction.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {participants.map((participant) => {
            const isPaid = participant.paidStatus === 'paid';
            const isCopied = copiedLink === participant.name;
            const payPalLink = generatePayPalPaymentLink(
              participant.paypalEmail,
              participant.shareAmount,
              `FairShare Settlement (${bills.map((b) => b.billNumber).join(', ')})`
            );

            return (
              <div
                key={participant.name}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-outline-variant transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-bold text-xs flex items-center justify-center uppercase shadow-sm">
                        {participant.name.slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                          {participant.name}
                          {participant.name === 'You' && (
                            <span className="text-[10px] text-secondary font-normal">(Host)</span>
                          )}
                        </h3>
                        <p className="text-[11px] text-on-surface-variant font-mono truncate max-w-[150px]">
                          {participant.paypalEmail}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePaidStatus(participant.name)}
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider transition-all ${
                        isPaid
                          ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                          : 'bg-amber-500/15 text-amber-600 border border-amber-500/30 hover:bg-amber-500/25'
                      }`}
                    >
                      {isPaid ? 'PAID' : 'UNPAID'}
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-outline-variant/20 flex items-baseline justify-between">
                    <span className="text-xs text-on-surface-variant">Total Share ({bills.length} bills):</span>
                    <span className="text-xl font-extrabold text-on-surface font-mono">
                      ${Number(participant.shareAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href={payPalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                  >
                    <span>Request via PayPal</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>

                  <button
                    type="button"
                    onClick={() => copyPaymentLink(participant)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-medium border border-outline-variant/30 transition-colors"
                  >
                    <span>{isCopied ? 'Link Copied!' : 'Copy PayPal Link'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* NEW BILL MODAL */}
      {showAddBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                Create New Expense Bill
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary-container text-on-surface">
                  {getNextBillNumber()}
                </span>
              </h3>
              <button
                onClick={() => setShowAddBillModal(false)}
                className="text-on-surface-variant hover:text-on-surface text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              Each bill receives a permanent unique number so you can track multiple dinners, cabs, or activities without anything jumbling up.
            </p>

            <form onSubmit={handleCreateBlankBill} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Bill / Expense Title
                </label>
                <input
                  type="text"
                  value={newBillName}
                  onChange={(e) => setNewBillName(e.target.value)}
                  placeholder="e.g. Cocktail Bar, Museum Tickets, Airbnb Groceries"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:border-primary"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBillModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-sm transition-colors"
                >
                  Create {getNextBillNumber()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};