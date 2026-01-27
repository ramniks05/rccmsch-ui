// ================= home-model.ts =================

export interface HomeData {
  stateConfig: {
    stateName: string;
    departmentName: string;
    primaryColor: string;
    secondaryColor: string;
    helpline: string;
    email: string;
    logoUrl: string;
  };

  banners: Banner[];

  statistics: {
    label: string;
    value: number;
  }[];

  notices: {
    title: string;
    date?: string;
    isNew?: boolean;
  }[];

  quickServices?: {
    title: string;
    icon: string;
  }[];

  categories?: {
    title: string;
    icon: string;
  }[];

  vision?: string;
  mission?: string;

  whatsNew?: string[];

  /** 🔥 ADD THESE */
  highlights?: Highlight[];
  menu?: MenuItem[];
  services?: Service[];
  marqueeText?: string[];
}

/* ================= SUPPORTING MODELS ================= */

export interface Banner {
  imageUrl: string;
  title: string;
  subtitle: string;
}

export interface Highlight {
  title: string;
  description: string;
  icon: string;
}

export interface MenuItem {
  label: string;
  icon: string;
  children?: string[];
}

export interface Service {
  title: string;
  icon: string;
  open: boolean;
  items: {
    label: string;
    link: string;
  }[];
}
