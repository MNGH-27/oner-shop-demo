import { AccountLoginRequired } from "@components/modules/account/AccountLoginRequired";
import { AddressBook } from "@components/modules/address/AddressBook";

export const metadata = { title: "نشانی‌های من" };

export default function AddressesPage() {
  return (
    <AccountLoginRequired>
      <AddressBook />
    </AccountLoginRequired>
  );
}
