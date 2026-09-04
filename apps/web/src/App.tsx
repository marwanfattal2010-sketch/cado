import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { Layout } from "./components/Layout";
import { Skeleton } from "./components/Skeleton";
import { useTrackPageView } from "./hooks/useTrackPageView";
import { useDeliveryWindow } from "./hooks/useDeliveryWindow";
import { useTapGuard } from "./hooks/useTapGuard";

/**
 * ROUTE-LEVEL CODE SPLITTING.
 *
 * The storefront used to ship as one 898KB file, so opening the home page
 * also downloaded checkout, the gift-card group-pool flow, the admin money
 * screen and every legal page — none of which most visitors ever open. On a
 * slow connection that whole download happens before anything renders.
 *
 * HOME AND LAYOUT ARE DELIBERATELY EAGER. Home is where almost every session
 * starts, so putting it behind a dynamic import would add a second round trip
 * before the first paint — the opposite of the point. Layout is the frame
 * around nearly every other page and would be fetched immediately anyway.
 *
 * Everything else is fetched when its route is actually visited.
 */
import { Home } from "./pages/Home";

const Browse = lazy(() => import("./pages/Browse").then((m) => ({ default: m.Browse })));
const BrowseResults = lazy(() =>
  import("./pages/BrowseResults").then((m) => ({ default: m.BrowseResults }))
);
const Stores = lazy(() => import("./pages/Stores").then((m) => ({ default: m.Stores })));
const CategoryStores = lazy(() =>
  import("./pages/CategoryStores").then((m) => ({ default: m.CategoryStores }))
);
const CategoryOccasion = lazy(() =>
  import("./pages/CategoryOccasion").then((m) => ({ default: m.CategoryOccasion }))
);
const Store = lazy(() => import("./pages/Store").then((m) => ({ default: m.Store })));
const Product = lazy(() => import("./pages/Product").then((m) => ({ default: m.Product })));
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Signup = lazy(() => import("./pages/Signup").then((m) => ({ default: m.Signup })));
const Cart = lazy(() => import("./pages/Cart").then((m) => ({ default: m.Cart })));
const Checkout = lazy(() => import("./pages/Checkout").then((m) => ({ default: m.Checkout })));
const OrderConfirmed = lazy(() =>
  import("./pages/OrderConfirmed").then((m) => ({ default: m.OrderConfirmed }))
);
const Search = lazy(() => import("./pages/Search").then((m) => ({ default: m.Search })));
const Orders = lazy(() => import("./pages/Orders").then((m) => ({ default: m.Orders })));
const OrderDetail = lazy(() =>
  import("./pages/OrderDetail").then((m) => ({ default: m.OrderDetail }))
);
const Account = lazy(() => import("./pages/Account").then((m) => ({ default: m.Account })));
const Wishlist = lazy(() => import("./pages/Wishlist").then((m) => ({ default: m.Wishlist })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const HelpCenter = lazy(() => import("./pages/HelpCenter").then((m) => ({ default: m.HelpCenter })));
const Language = lazy(() => import("./pages/Language").then((m) => ({ default: m.Language })));
const GiftFinder = lazy(() => import("./pages/GiftFinder").then((m) => ({ default: m.GiftFinder })));
const Occasions = lazy(() => import("./pages/Occasions").then((m) => ({ default: m.Occasions })));
const GiftCards = lazy(() => import("./pages/GiftCards").then((m) => ({ default: m.GiftCards })));
const GiftCardSend = lazy(() =>
  import("./pages/GiftCardSend").then((m) => ({ default: m.GiftCardSend }))
);
const GiftCardRedeem = lazy(() =>
  import("./pages/GiftCardRedeem").then((m) => ({ default: m.GiftCardRedeem }))
);
const GiftCardGroupCreate = lazy(() =>
  import("./pages/GiftCardGroupCreate").then((m) => ({ default: m.GiftCardGroupCreate }))
);
const GiftCardGroupPool = lazy(() =>
  import("./pages/GiftCardGroupPool").then((m) => ({ default: m.GiftCardGroupPool }))
);
const GiftCardGroupChipIn = lazy(() =>
  import("./pages/GiftCardGroupChipIn").then((m) => ({ default: m.GiftCardGroupChipIn }))
);
const AdminMoney = lazy(() => import("./pages/AdminMoney").then((m) => ({ default: m.AdminMoney })));
const About = lazy(() => import("./pages/About").then((m) => ({ default: m.About })));
const PrivacyPolicy = lazy(() =>
  import("./pages/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy }))
);
const TermsOfService = lazy(() =>
  import("./pages/TermsOfService").then((m) => ({ default: m.TermsOfService }))
);
const DeliveryReturns = lazy(() =>
  import("./pages/DeliveryReturns").then((m) => ({ default: m.DeliveryReturns }))
);
const Partners = lazy(() => import("./pages/Partners").then((m) => ({ default: m.Partners })));
const Find = lazy(() => import("./pages/Find").then((m) => ({ default: m.Find })));
const GiftAssistant = lazy(() =>
  import("./pages/GiftAssistant").then((m) => ({ default: m.GiftAssistant }))
);
const Points = lazy(() => import("./pages/Points").then((m) => ({ default: m.Points })));
const Notifications = lazy(() =>
  import("./pages/Notifications").then((m) => ({ default: m.Notifications }))
);

/**
 * What shows while a route's chunk arrives.
 *
 * NOT a spinner and not a blank screen. A chunk usually lands in well under a
 * second, and both of those read as "something went wrong" for that long. A
 * page-shaped set of blocks reads as "the page is coming" — which is true,
 * and it is the same skeleton language the rest of the app already uses.
 */
function RouteFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="mt-4 h-4 w-1/2" />
      <Skeleton className="mt-8 aspect-[3/2] w-full rounded-card" />
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Skeleton className="aspect-[3/4] w-full rounded-card" />
        <Skeleton className="aspect-[3/4] w-full rounded-card" />
      </div>
    </div>
  );
}

export default function App() {
  // CADO's own page-view count. Mounted once above every route so it sees each
  // navigation exactly once, and never blocks rendering.
  useTrackPageView();
  // The real opening hours, published once for every delivery line on the site.
  useDeliveryWindow();
  // A drag is never a tap: swiping a rail must not open whatever card the
  // finger happened to lift on.
  useTapGuard();

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Outside Layout on purpose. Home owns its whole viewport: the shell
            is 100dvh with each tab panel scrolling independently, which cannot
            work inside Layout's single window scroll — and Layout's page
            transition applies a transform, which would unpin the bottom nav
            and the sheet backdrop inside the pager. */}
        <Route path="/" element={<Home />} />
        {/* The page shipped here first, so links to it are already out in the
            world. Replace, not push: it must not sit in history as a step to
            go "back" to. */}
        <Route path="shop" element={<Navigate to="/" replace />} />
        {/* Outside Layout, like Home. The assistant owns the whole viewport,
            and Layout wraps its pages in a transform-based transition — which
            would make it the containing block for anything positioned inside.
            Its own route also means the back gesture exits it. */}
        <Route path="assistant" element={<GiftAssistant />} />
        {/* The results page. Outside Layout: it owns its own sticky chrome and
            must not sit under the app header as well. */}
        <Route path="browse" element={<BrowseResults />} />
        <Route element={<Layout />}>
          <Route path="search" element={<Search />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="account" element={<Account />} />
          <Route path="points" element={<Points />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<HelpCenter />} />
          <Route path="language" element={<Language />} />
          <Route path="browse-all" element={<Browse />} />
          {/* Every live store, one card each — the See-all behind "Stores on CADO". */}
          <Route path="stores" element={<Stores />} />
          {/* One category's shops — the "See all" beside Stores in Fashion. */}
          <Route path="stores/:cat" element={<CategoryStores />} />
          {/* One category page, and it is a tab on "/". This only keeps old
              links alive. */}
          <Route path="category/:slug" element={<CategoryOccasion />} />
          {/* :slug, but useStore also accepts a uuid — /store/<uuid> links
              were shipped before the slug route existed. */}
          <Route path="store/:slug" element={<Store />} />
          <Route path="product/:id" element={<Product />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order-confirmed/:id" element={<OrderConfirmed />} />
          {/* The quiz. /gift-finder is the results grid it hands off to. */}
          <Route path="find" element={<Find />} />
          <Route path="gift-finder" element={<GiftFinder />} />
          <Route path="occasions" element={<Occasions />} />
          <Route path="gift-cards" element={<GiftCards />} />
          <Route path="gift-cards/send" element={<GiftCardSend />} />
          {/* Its own screen, and the address share links already point at. The
              `?code=` they carry is read by the redeem box. */}
          <Route path="gift-cards/redeem" element={<GiftCardRedeem />} />
          {/* The group pages are deliberately outside any auth gate: the whole
              point of the slug is that it opens for someone who has never used
              CADO. Only creating one needs an account. */}
          <Route path="gift-cards/group/new" element={<GiftCardGroupCreate />} />
          <Route path="gift-cards/group/:slug" element={<GiftCardGroupPool />} />
          <Route path="gift-cards/group/:slug/chip-in" element={<GiftCardGroupChipIn />} />
          <Route path="admin/money" element={<AdminMoney />} />
          <Route path="about" element={<About />} />
          <Route path="privacy" element={<PrivacyPolicy />} />
          <Route path="terms" element={<TermsOfService />} />
          <Route path="delivery-returns" element={<DeliveryReturns />} />
          <Route path="partners" element={<Partners />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
