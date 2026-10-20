import Link from 'next/link';
import { ArrowUpRight, Store, Milk, Building2, ShoppingBasket, Truck, NotebookPen, Check } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { breadcrumbSchema } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';
import { dailySupplyData as data } from '@/data/dailysupply';
import CinematicHero from '@/components/products/dailysupply/CinematicHero';
import styles from './showcase.module.css';

const icons = { store: Store, milk: Milk, community: Building2, basket: ShoppingBasket, truck: Truck, records: NotebookPen };
function Icon({ name, ...props }) { const Component = icons[name]; return <Component aria-hidden="true" {...props} />; }

export default function DailySupplyProductPage() {
  return (
    <div className={styles.page}>
      <Navbar />
      <main>
        <JsonLd data={breadcrumbSchema([{name:'Home',path:'/'},{name:'Products',path:'/products'},{name:'Daily Supply',path:'/products/dailysupply'}])} />
        <JsonLd data={{ '@context':'https://schema.org', '@type':'SoftwareApplication', name:'Daily Supply', description:data.description, applicationCategory:'BusinessApplication', operatingSystem:'Web', url:absoluteUrl('/products/dailysupply') }} />
        <CinematicHero />

        <section id="discover" className={styles.challenges} data-theme="light">
          <div className={styles.container}>
            <div className={styles.sectionHeading}><p className={styles.eyebrow}>01 / The everyday opportunity</p><div><h2>Local commerce is personal.<br/><span>Managing it should feel simpler.</span></h2><p>Daily Supply brings the pieces of everyday commerce together, so stores, vendors, and communities can work with greater clarity.</p></div></div>
            <div className={styles.challengeGrid}>{data.challenges.map(item=><article className={styles.challenge} key={item.number}><div className={styles.cardTop}><span>{item.number}</span><Icon name={item.icon} size={27}/></div><h3>{item.title}</h3><p>{item.problem}</p><div className={styles.solution}><span><Check size={15}/> {item.label}</span><p>{item.solution}</p></div></article>)}</div>
          </div>
        </section>

        <section className={styles.journey} data-theme="dark">
          <div className={styles.container}>
            <div className={styles.journeyHeading}><div><p className={styles.eyebrow}>02 / A day with Daily Supply</p><h2>Different routines.<br/><em>One connected journey.</em></h2></div><p>From a household’s daily needs to the store that serves them, every step has a place.<span className={styles.exampleBadge}>Example workflow</span></p></div>
            <ol className={styles.steps}>{data.journey.map((item,index)=><li key={item.title}><div className={styles.stepVisual}><Icon name={item.icon} size={36}/><span>0{index+1}</span></div><h3>{item.title}</h3><p>{item.text}</p></li>)}</ol>
            <div className={styles.capabilityLine}><span>Billing & inventory</span><span>Recurring subscriptions</span><span>Community orders</span><span>Digital khata</span></div>
          </div>
        </section>

        <section className={styles.audiences} data-theme="light">
          <div className={styles.container}><div className={styles.sectionHeading}><p className={styles.eyebrow}>03 / Built around people</p><div><h2>For the people who keep<br/><span>everyday life moving.</span></h2></div></div>
            <div className={styles.audienceList}>{data.audiences.map(item=><article className={styles.audience} key={item.number}><span className={styles.audienceNumber}>{item.number}</span><div className={styles.audienceIcon}><Icon name={item.icon} size={32}/></div><div><h3>{item.title}</h3><p>{item.text}</p></div><p className={styles.scenario}>{item.example}</p></article>)}</div>
          </div>
        </section>

        <section className={styles.closing} data-theme="dark"><div className={styles.container}><p className={styles.eyebrow}>The next everyday connection</p><h2>Discover what Daily Supply<br/>{" "}can bring to <em>your community.</em></h2><Link className={styles.primaryButton} href="/contact">Talk to us about Daily Supply <ArrowUpRight size={19}/></Link><p className={styles.closingCredit}>In collaboration with VitaTech Solutions and BYP Capital</p></div></section>
      </main>
      <Footer />
    </div>
  );
}
