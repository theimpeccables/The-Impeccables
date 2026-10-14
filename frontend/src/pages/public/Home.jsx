import React from 'react';
import { HeroSection } from '../../components/sections/HeroSection';
import {
  HomeAboutSection,
  HomeDomainsSection,
  HomeGalleryEventsSection,
  HomeTeamCtaSection,
} from '../../components/sections/HomeSections';

export const Home = () => (
  <div className="home-page relative min-h-screen overflow-hidden bg-[#050505] text-gray-100">
    <HeroSection />
    <div className="home-page-atmosphere pointer-events-none absolute inset-x-0 top-[100svh] bottom-0" aria-hidden="true" />
    <div className="home-page-content relative z-10">
      <HomeAboutSection />
      <HomeDomainsSection />
      <HomeGalleryEventsSection />
      <HomeTeamCtaSection />
    </div>
  </div>
);

export default Home;
