import { openLink } from "@telegram-apps/sdk-react";
import { Button, Placeholder, Text } from "@telegram-apps/telegram-ui";
import Lottie from "lottie-react";

import { useTgsAnimation } from "@/hooks/useTgsAnimation.ts";

import styles from "./EmptyState.module.css";

type EmptyStateProps = {
  inviteUrl?: string;
  onInvite?: () => void;
};

const NO_GROUPS_TGS = new URL("../../../assets/lottie/no-groups.tgs", import.meta.url).href;

export function EmptyState({ inviteUrl, onInvite }: EmptyStateProps) {
  const { data, isLoading } = useTgsAnimation<Record<string, unknown>>(NO_GROUPS_TGS);

  const handleInvite = () => {
    if (inviteUrl) {
      void openLink(inviteUrl);
      return;
    }
    onInvite?.();
  };

  return (
    <div className={styles.wrapper} dir="rtl">
      <Placeholder
        className={styles.placeholder}
        header={"\\u0647\\u0646\\u0648\\u0632 \\u06AF\\u0631\\u0648\\u0647\\u06CC \\u062B\\u0628\\u062A \\u0646\\u0634\\u062F\\u0647"}
        description={
          <Text weight="2" className={styles.description}>
            {"\u0634\u0645\u0627 \u0647\u06CC\u0686 \u06AF\u0631\u0648\u0647\u06CC \u062A\u062D\u062A \u0645\u062F\u06CC\u0631\u06CC\u062A \u0627\u06CC\u0646 \u0631\u0628\u0627\u062A \u0646\u062F\u0627\u0631\u06CC\u062F."}
          </Text>
        }
      >
        <div className={styles.animationContainer}>
          {data && <Lottie animationData={data} loop autoplay />}
          {!data && isLoading && <div className={styles.loader} />}
        </div>
        <Button
          className={styles.cta}
          mode="filled"
          size="l"
          stretched
          onClick={handleInvite}
          disabled={!inviteUrl && !onInvite}
        >
          {"\u2795 \u0627\u0641\u0632\u0648\u062F\u0646 \u0631\u0628\u0627\u062A \u0628\u0647 \u06AF\u0631\u0648\u0647"}
        </Button>
      </Placeholder>
    </div>
  );
}






