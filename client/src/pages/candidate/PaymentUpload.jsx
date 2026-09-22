import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadPayment, getPaymentStatus } from '../../api';
import useCandidateStore from '../../stores/candidateStore';
import { compressImage, formatBytes } from '../../utils/imageCompressor';

export default function PaymentUpload() {
  const { candidateId, name, subject, paymentStatus, setPaymentStatus } = useCandidateStore();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [compressionInfo, setCompressionInfo] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const EXAM_FEE = 500;
  const SUBJECT_LABELS = {
    marketing: 'Marketing',
    hr: 'Human Resources',
    digital_marketing: 'Digital Marketing',
    general_reasoning: 'General Reasoning',
  };

  useEffect(() => {
    if (!candidateId || !subject) { navigate('/'); return; }

    // Check if already paid
    getPaymentStatus(candidateId)
      .then(({ data }) => {
        if (data.paymentStatus === 'approved') {
          setPaymentStatus('approved');
          navigate('/waiting');
        } else if (data.hasUploaded && data.paymentStatus === 'pending') {
          setPaymentStatus('pending');
          navigate('/waiting');
        }
      })
      .catch(() => {});
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.).');
      return;
    }

    // Validate file size (max 10MB input before compression)
    if (file.size > 10 * 1024 * 1024) {
      setError('Original file size must be less than 10MB.');
      return;
    }

    setError('');
    setCompressing(true);

    try {
      // Compress image client-side to max 1200px and 78% quality
      const result = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.78 });
      setPreview(result.dataUrl);
      setCompressionInfo({
        original: formatBytes(result.originalSize),
        compressed: formatBytes(result.compressedSize),
      });
    } catch (err) {
      setError('Failed to process image. Please choose another one.');
    } finally {
      setCompressing(false);
    }
  };

  const handleUpload = async () => {
    if (!preview) {
      setError('Please select a screenshot first.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      await uploadPayment({ candidateId, screenshot: preview });
      setSuccess(true);
      setPaymentStatus('pending');
      setTimeout(() => navigate('/waiting'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!candidateId) return null;

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-dark-800/90 border border-white/10 mb-4 shadow-xl shadow-primary-500/15">
            <img src="/Logo1.jpg" alt="DS Logo" className="h-12 w-auto max-w-[160px] object-contain rounded-lg" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">Payment Required</h1>
          <p className="text-slate-400 mt-2">Complete payment to access your exam</p>
        </div>

        {success ? (
          <div className="glass-card p-8 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-emerald-500/30">
              ✅
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Screenshot Uploaded!</h2>
            <p className="text-slate-400 text-sm">
              Your payment is being reviewed by the admin. You'll be redirected to the waiting room...
            </p>
            <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mt-6" />
          </div>
        ) : (
          <div className="glass-card p-5 sm:p-8">
            {/* Candidate info */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <div>
                <p className="text-white font-medium text-sm">{name}</p>
                <p className="text-primary-300 text-xs">{SUBJECT_LABELS[subject]}</p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-400 font-bold text-lg">₹{EXAM_FEE}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center mb-6">
              <p className="text-sm text-slate-400 mb-3">Scan the QR code to pay</p>
              <div className="inline-block p-3 bg-white rounded-2xl shadow-lg shadow-primary-500/10">
                <img
                  src="/payment-qr.jpeg"
                  alt="Payment QR Code"
                  className="w-56 h-56 object-contain"
                />
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Pay <span className="text-amber-400 font-semibold">₹{EXAM_FEE}</span> using any UPI app
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Then upload screenshot</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                preview
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-white/15 bg-white/3 hover:border-primary-500/40 hover:bg-primary-500/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {compressing ? (
                <div className="py-8 text-center">
                  <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-primary-300 text-sm font-medium">Optimizing screenshot...</p>
                  <p className="text-slate-500 text-xs mt-1">Compressing for instant upload</p>
                </div>
              ) : preview ? (
                <div>
                  <img
                    src={preview}
                    alt="Payment screenshot preview"
                    className="max-h-48 mx-auto rounded-xl border border-white/10 shadow-lg mb-3"
                  />
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <p className="text-emerald-400 text-sm font-medium">Screenshot selected ✓</p>
                    {compressionInfo && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {compressionInfo.original} → {compressionInfo.compressed}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-1">Click to change</p>
                </div>
              ) : (
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-white font-medium text-sm">Upload Payment Screenshot</p>
                  <p className="text-slate-500 text-xs mt-1">Click to browse or drag & drop</p>
                  <p className="text-slate-600 text-xs mt-2">JPEG, PNG up to 10MB (auto-compressed)</p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!preview || uploading || compressing}
              className="btn-primary w-full py-4 text-base mt-6"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </span>
              ) : compressing ? (
                'Optimizing image...'
              ) : '📤 Upload & Submit for Review'}
            </button>

            {/* Instructions */}
            <div className="mt-6 p-4 rounded-xl bg-white/3 border border-white/5">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Steps</p>
              <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
                <li>Scan the QR code using any UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
                <li>Complete the payment of <span className="text-amber-400 font-medium">₹{EXAM_FEE}</span></li>
                <li>Take a screenshot of the payment confirmation</li>
                <li>Upload the screenshot above</li>
                <li>Wait for admin approval to access the exam</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
