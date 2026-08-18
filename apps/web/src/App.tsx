import { Routes, Route, Navigate, useLocation } from "react-router-dom";

/**
 * /gift-cards/redeem is gone as a page — redeeming lives on the Gift Cards
 * page itself — but the URL is NOT gone as an address: group-gift share
 * links carry `?code=` on it and those links are already in people's chats.
 * The query string must survive the redirect, so the redeem box can prefill
 * the code the link was sent with.
 */
function RedeemRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/gift-cards", search: location.search }} replace />;
}
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Browse } from "./pages/Browse";
import { Stores } from "./pages/Stores";
import { CategoryRedirect } from "./pages/CategoryRedirect";
import { Store } from "./pages/Store";
import { Product } from "./pages/Product";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { OrderConfirmed } from "./pages/OrderConfirmed";
import { Search } from "./pages/Search";
import { Orders } from "./pages/Orders";
import { OrderDetail } from "./pages/OrderDetail";
import { Account } from "./pages/Account";
import { Wishlist } from "./pages/Wishlist";
import { Settings } from "./pages/Settings";
import { HelpCenter } from "./pages/HelpCenter";
import { Language } from "./pages/Language";
import { GiftFinder } from "./pages/GiftFinder";
import { Occasions } from "./pages/Occasions";
import { GiftCards } from "./pages/GiftCards";
import { GiftCardSend } from "./pages/GiftCardSend";

import { GiftCardGroupCreate } from "./pages/GiftCardGroupCreate";
import { GiftCardGroupPool } from "./pages/GiftCardGroupPool";
import { GiftCardGroupChipIn } from "./pages/GiftCardGroupChipIn";
import { AdminMoney } from "./pages/AdminMoney";
import { About } from "./pages/About";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import { DeliveryReturns } from "./pages/DeliveryReturns";
import { Partners } from "./pages/Partners";
import { Find } from "./pages/Find";

export default function App() {
  return (
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
      <Route element={<Layout />}>
        <Route path="search" element={<Search />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="account" element={<Account />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<HelpCenter />} />
        <Route path="language" element={<Language />} />
        <Route path="browse" element={<Browse />} />
        {/* Every live store, one card each — the See-all behind "Stores on CADO". */}
        <Route path="stores" element={<Stores />} />
        {/* One category page, and it is a tab on "/". This only keeps old
            links alive. */}
        <Route path="category/:slug" element={<CategoryRedirect />} />
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
        {/* Redeeming lives on the Gift Cards page itself now; the old URL keeps working. */}
        <Route path="gift-cards/redeem" element={<RedeemRedirect />} />
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
  );
}
