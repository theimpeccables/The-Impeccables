import React, { useState } from 'react';
import { notify } from '../../utils/notify';
import { Mail, MapPin, Phone, Send, Sparkles } from 'lucide-react';
import { APP_CONFIG } from '../../constants';
import api, { apiErrorMessage } from '../../services/api';
import { usePublicData } from '../../hooks/usePublicData';
import { SelectField } from '../../components/ui/Primitives';

export const Contact = () => {
  const { data: domains } = usePublicData('/domains');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNo: '',
    domainInterest: 'creative-arts',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitError, setSubmitError] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await api.post('/contact', formData);
      setIsSubmitting(false);
      notify({
          type: 'success',
          title: 'Message Dispatched!',
          message: 'Your inquiry has been received by society coordinators. We will reply within 24 hours.',
      });
      setFormData({
        name: '',
        email: '',
        rollNo: '',
        domainInterest: 'creative-arts',
        message: '',
      });
    } catch (error) {
      setIsSubmitting(false);
      setSubmitError(apiErrorMessage(error, 'Message could not be sent. Please try again later.'));
    }
  };

  return (
    <div className="public-page max-w-7xl mx-auto text-gray-100 flex flex-col">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-red-400 font-bold mb-3 block">
          GET IN TOUCH
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-tight font-display">
          CONNECT WITH{' '}
          <span className="text-red-500 drop-shadow-[0_0_25px_rgba(255,30,56,0.5)]">
            THE SOCIETY
          </span>
        </h1>
        <p className="mt-4 text-sm sm:text-base text-gray-400 leading-relaxed max-w-xl mx-auto">
          Have an exhibition proposal, collaboration request, or question about upcoming auditions? Reach out to our executive desk.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Contact Form */}
        <div className="lg:col-span-7">
          <div className="p-8 sm:p-10 rounded-3xl bg-[#0b0b12] border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Send an Inquiry</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {submitError && <p className="text-sm text-red-300" role="alert">{submitError}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/70 transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. aarav@kiet.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/70 transition-colors text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                    College Roll No / Branch (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2300290100012, CSE"
                    value={formData.rollNo}
                    onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/70 transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                    Domain of Interest
                  </label>
                  <SelectField value={formData.domainInterest} onChange={(value) => setFormData({ ...formData, domainInterest: value })} options={domains.map((domain) => ({ value: domain.slug, label: domain.name }))} className="h-[46px]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
                  Message / Inquiry *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Share details regarding your collaboration idea, query, or audition request..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/70 transition-colors text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(255,30,56,0.5)] transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending...' : 'Send Message to Leadership'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-8 rounded-3xl border border-white/10 bg-[#0b0b12] shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6">Society Headquarters</h3>
            
            <div className="space-y-5 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Campus Location</div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    Cultural Affairs Wing, Audi Complex Floor 2, {APP_CONFIG.university}, {APP_CONFIG.location}.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Official Correspondence</div>
                  <p className="text-xs text-gray-400 mt-0.5">{APP_CONFIG.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Society Studio Hours</div>
                  <p className="text-xs text-gray-400 mt-0.5">Mon – Sat: 4:30 PM to 8:00 PM IST (Post-classes)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-3xl border border-red-500/20 bg-red-950/20 shadow-xl">
            <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-400" />
              Auditions Notice
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              Recruitment rounds for creative domains occur each semester. For portfolio evaluations outside the audition cycle, mention your portfolio link in the inquiry message.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Contact;
