import { useState, useMemo } from 'react';
import {
  Activity, Droplet, Search, Calculator, ArrowLeft, Info,
  ShieldAlert, ChevronRight, Settings, AlertTriangle, X,
  Beaker, CheckCircle, AlertOctagon, Filter, FileSpreadsheet,
  Layers, Stethoscope, RefreshCw, ArrowRightLeft
} from 'lucide-react';


// --- Global Styles for Animations ---
const CustomStyles = () => (
  <style>{`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.5s ease-out forwards;
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out forwards;
    }
  `}</style>
);

// --- Type Definitions ---
type ViewMode = 'home' | 'manufacturer' | 'classification' | 'treatment' | 'apheresis_menu' | 'apheresis_list' | 'column_list' | 'apheresis_disease';
type ProductType = 'dialyzer' | 'hemodiafilter' | 'column';
type ApheresisType = 'CRRT' | 'PE' | 'DFPP' | 'PA' | 'DHP' | 'CART';

// JSDT新機能分類 (HD用)
type JSDTClass = 'Ⅰa' | 'Ⅰb' | 'Ⅱa' | 'Ⅱb' | 'S' | '特定積層型';

// HDF膜分類 (HDF用)
type HDFClass = 'Alb低漏出' | 'Alb中漏出' | 'Alb高漏出' | '吸着型';

interface DialyzerSpec {
  area: number; // m2
  ufr: number; // mL/hr/mmHg
  vol: number; // Priming volume mL
  clearance: {
    ure: number; // QD=500, QB=200
    b2mg?: number;
    phos?: number;
    b12?: number; 
  };
}

interface DialyzerSeries {
  id: string;
  name: string;
  maker: string;
  type: ProductType; 
  jsdtClass?: JSDTClass;
  hdfClass?: HDFClass;
  material: string;
  pvp: string; 
  bpa: string; 
  sterilization: string; 
  features: string[];
  specs: { [key: number]: DialyzerSpec }; 
}

interface ApheresisDevice {
  id: string;
  name: string;
  maker: string;
  type: string;
  category: ApheresisType | 'COLUMN'; 
  material?: string;
  indication: string[];
  contraindication?: string[];
  items: string[];
  priming: {
    steps: string[];
    vol_blood: number | string;
    vol_wash: string;
  };
  treatment: {
    qb: string;
    qd?: string;
    time?: string;
    notes: string[];
  };
  finish: {
    method: string;
    vol: string;
  };
  insurance: string;
}

// --- Reimbursement Data ---
const REIMBURSEMENT_INFO = {
  CRRT: {
    title: "持続緩徐式血液濾過 (J038-2)",
    points: "1,990点 / 1日につき",
    material: [
      { name: "持続緩徐式血液濾過器 (標準型・一般用)", price: "27,000円 (1日につき)" },
      { name: "対象製品", list: ["キュアフローA", "ヴィライフ", "エクセルフロー", "セプザイリス"] }
    ],
    notes: [
      "時間外・休日加算: +300点",
      "障害者等加算: +120点",
      "夜間開始(午後5時以降)等の規定あり",
      "人工腎臓(J038)と併せて月14回限度 (例外あり)",
      "適応: 末期腎不全、AKI(アシドーシス/尿毒症/電解質異常/体液過剰)、薬物中毒、重症膵炎(概ね8回)、重症敗血症、劇症肝炎/術後肝不全(月10回/3ヶ月)"
    ]
  },
  PE: {
    title: "血漿交換療法 (J039)",
    points: "4,200点 / 1日につき",
    material: [
      { name: "血漿交換用血漿分離器", price: "30,200円" },
      { name: "対象製品", list: ["プラズマフローOP", "サルフラックスFP", "エバキュアープラス"] }
    ],
    notes: [
      "適応疾患により実施回数・期間制限が異なる",
      "多発性骨髄腫・マクログロブリン血症: 週1回 (3ヶ月限度)",
      "劇症肝炎: 一連につき概ね10回限度",
      "術後肝不全: 一連につき概ね7回限度",
      "薬物中毒: 一連につき概ね8回限度",
      "その他、重症筋無力症、SLE、TTP等に特定の算定ルールあり"
    ]
  },
  DFPP: {
    title: "血漿交換療法 (J039) - 二重濾過法",
    points: "4,200点 / 1日につき",
    material: [
      { name: "血漿交換用血漿分離器", price: "30,200円" },
      { name: "血漿交換用血漿成分分離器", price: "23,700円" },
      { name: "対象製品", list: ["カスケードフローEC"] }
    ],
    notes: [
      "家族性高コレステロール血症、ABO不適合移植、免疫神経疾患等",
      "原則として血漿補充を要しない場合が多い"
    ]
  },
  PA: {
    title: "血漿交換療法 (J039) - 血漿吸着法",
    points: "4,200点 / 1日につき",
    material: [
      { name: "血漿分離器", price: "30,200円" },
      { name: "選択的血漿成分吸着器(劇症肝炎用)", price: "69,900円 (プラソーバBRS)" },
      { name: "選択的血漿成分吸着器(劇症肝炎用以外)", price: "83,600円 (イムソーバTR/PH, リポソーバーLA-15/40S, セレソーブ)" }
    ],
    notes: [
      "劇症肝炎・術後肝不全 (BRS)",
      "家族性高コレステロール血症、ASO、巣状糸球体硬化症 (リポソーバー)",
      "重症筋無力症、SLE、RA等 (イムソーバ)",
      "SLE (セレソーブ)"
    ]
  },
  DHP: {
    title: "吸着式血液浄化法 / 血球成分除去療法",
    points: "2,000点 (J041) / 2,000点 (J041-2)",
    material: [
      { name: "吸着式血液浄化用浄化器 (中毒等)", price: "133,000円 (ヘモソーバCHS)" },
      { name: "吸着型血液浄化器 (閉塞性動脈硬化症用)", price: "172,000円 (レオカーナ)" },
      { name: "エンドトキシン選択的吸着(DHP)", price: "365,000円 (トレミキシン)" },
      { name: "血球細胞除去用浄化器", price: "172,000円 (イムノピュア, アダカラム)" }
    ],
    notes: [
      "【J041 吸着式血液浄化法】: 肝性昏睡または薬物中毒",
      "【J041-2 血球成分除去療法】: 潰瘍性大腸炎 (イムノピュア/アダカラム)。一連につき10回限度(週1回)。",
      "【アダカラムの敗血症適応】: 敗血症で集学的治療が必要な場合。1日3個、一連につき5個限度。診療報酬は一連につき3回限度。",
      "【特定保険医療材料 (レオカーナ)】: 閉塞性動脈硬化症で潰瘍・壊疽を有する場合。一連につき10回（3ヶ月）限度。",
      "【特定保険医療材料 (トレミキシン)】: グラム陰性菌感染症等。一連につき2回限度。"
    ]
  },
  COLUMN: {
    title: "人工腎臓 (J038) + 特定保険医療材料",
    points: "人工腎臓の所定点数に含まれる (材料は別算定)",
    material: [
      { name: "人工腎臓用特定保険医療材料（β2-MG吸着器）", price: "29,900円" },
      { name: "対象製品", list: ["リクセル", "フィルトール"] }
    ],
    notes: [
      "透析アミロイドーシス患者に対し、疼痛やADLの改善等を目的として使用する場合に算定。",
      "認定施設基準（透析アミロイドーシスに対する吸着型血液浄化器の施設基準）あり。",
      "透析器と直列に接続して使用する。",
      "算定要件: 手根管開放術の既往がある、または骨嚢胞像が認められる等の要件を満たす必要あり。"
    ]
  },
  CART: {
    title: "胸水・腹水濾過濃縮再静注法 (K635)",
    points: "3,950点 / 1回につき",
    material: [
      { name: "腹水濾過器", price: "32,400円 (参考)" },
      { name: "腹水濃縮器", price: "38,700円 (参考)" },
      { name: "対象製品", list: ["AHF-MOW", "AHF-UF", "マスキュア"] }
    ],
    notes: [
      "難治性腹水症または難治性胸水症の患者に対し、濾過・濃縮して再静注した場合に算定。",
      "月2回を限度とする（ただし、治療上の必要性がある場合には月4回まで算定可。レセプト摘要欄に理由記載が必要）。",
      "使用する特定保険医療材料は別途算定可能。"
    ]
  }
};

// --- Database Construction ---

const DIALYZER_DB: DialyzerSeries[] = [
  // ====================
  //      BAXTER / GAMBRO (HD)
  // ====================
  {
    id: 'baxter-h12',
    name: 'H12 シリーズ',
    maker: 'バクスター',
    type: 'dialyzer',
    jsdtClass: '特定積層型',
    material: 'PAN (ポリアクリロニトリル)',
    pvp: '-',
    bpa: '-',
    sterilization: 'γ線',
    features: ['積層型(プレート)', 'ACE阻害薬併用禁忌', '陰性荷電'],
    specs: { 
      2800: { area: 1.04, ufr: 20, vol: 64, clearance: { ure: 180 } }, // Estimated typical
      3400: { area: 1.25, ufr: 25, vol: 76, clearance: { ure: 190 } },
      4000: { area: 1.53, ufr: 30, vol: 92, clearance: { ure: 198 } }
    }
  },
  // ====================
  //      NIPRO (HD)
  // ====================
  {
    id: 'nipro-fb-eco',
    name: 'FB-eco シリーズ',
    maker: 'ニプロ',
    type: 'dialyzer',
    jsdtClass: 'Ⅰa',
    material: 'CTA (セルローストリアセテート)',
    pvp: '-',
    bpa: '-',
    sterilization: 'γ線',
    features: ['ドライタイプ', '軽量化ハウジング', 'BPAフリー', 'PVPフリー'],
    specs: { 
      0.5: { area: 0.5, ufr: 10, vol: 35, clearance: { ure: 130 } },
      1.5: { area: 1.5, ufr: 26, vol: 90, clearance: { ure: 188 } },
      2.1: { area: 2.1, ufr: 39, vol: 125, clearance: { ure: 198 } },
      2.5: { area: 2.5, ufr: 47, vol: 145, clearance: { ure: 200 } }
    }
  },
  {
    id: 'nipro-fa-d-eco',
    name: 'FA-D eco (ファインネフロン)',
    maker: 'ニプロ',
    type: 'dialyzer',
    jsdtClass: 'Ⅱa',
    material: 'CTA (セルローストリアセテート)',
    pvp: '-',
    bpa: '-',
    sterilization: 'γ線',
    features: ['PVPフリー', 'BPAフリー', 'アレルギーリスク低減'],
    specs: { 
      1.5: { area: 1.5, ufr: 35, vol: 90, clearance: { ure: 190, b2mg: 30 } },
      2.1: { area: 2.1, ufr: 45, vol: 125, clearance: { ure: 198, b2mg: 40 } }
    }
  },
  // ====================
  //      ASAHI KASEI (HD)
  // ====================
  {
    id: 'asahi-aps-ua',
    name: 'APS-UA Series',
    maker: '旭化成',
    type: 'dialyzer',
    jsdtClass: 'Ⅰa',
    material: 'PS (ポリスルホン)',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['生体適合性・抗血栓性', 'Alb漏出抑制', 'ウェービング糸'],
    specs: { 
      1.5: { area: 1.5, ufr: 42, vol: 82, clearance: { ure: 196, b12: 140, phos: 185 } },
      2.1: { area: 2.1, ufr: 48, vol: 112, clearance: { ure: 199, b12: 158, phos: 192 } }
    }
  },
  {
    id: 'asahi-aps-ma',
    name: 'APS-MA Series',
    maker: '旭化成',
    type: 'dialyzer',
    jsdtClass: 'Ⅰa',
    material: 'PS (ポリスルホン)',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['Alb漏出抑制', '小分子除去性能'],
    specs: { 
      1.5: { area: 1.5, ufr: 56, vol: 88, clearance: { ure: 194, b12: 142, phos: 183 } },
      2.1: { area: 2.1, ufr: 75, vol: 119, clearance: { ure: 198, b12: 160, phos: 192 } }
    }
  },
  {
    id: 'asahi-aps-sa-nx',
    name: 'APS-SA NX Series',
    maker: '旭化成',
    type: 'dialyzer',
    jsdtClass: 'Ⅰa',
    material: 'PS (ポリスルホン)',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['小分子溶質の高除去', 'ウェービング糸', '軽量化容器(NX)'],
    specs: { 
      1.5: { area: 1.5, ufr: 60, vol: 84, clearance: { ure: 196, b12: 139, phos: 196 } },
      2.1: { area: 2.1, ufr: 84, vol: 116, clearance: { ure: 198, b12: 156, phos: 199 } }
    }
  },
  {
    id: 'asahi-aps-ea-nx',
    name: 'APS-EA NX Series',
    maker: '旭化成',
    type: 'dialyzer',
    jsdtClass: 'Ⅱa',
    material: 'PS (ポリスルホン)',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['中分子除去とAlb漏出抑制のバランス', '軽量化容器(NX)'],
    specs: { 
      1.5: { area: 1.5, ufr: 63, vol: 84, clearance: { ure: 196, b12: 144, phos: 184 } },
      2.1: { area: 2.1, ufr: 87, vol: 116, clearance: { ure: 198, b12: 160, phos: 192 } }
    }
  },
  {
    id: 'asahi-vps-ha',
    name: 'VPS-HA Series (旭ビタブレン)',
    maker: '旭化成',
    type: 'dialyzer',
    jsdtClass: 'S',
    material: 'Vit.E固定化PS',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['ビタミンE固定化', '抗酸化作用', '小分子除去性能'],
    specs: { 
      1.5: { area: 1.5, ufr: 63, vol: 82, clearance: { ure: 196, b12: 138, phos: 182 } },
      2.1: { area: 2.1, ufr: 74, vol: 112, clearance: { ure: 198, b12: 156, phos: 194 } }
    }
  },
  {
    id: 'asahi-vps-va',
    name: 'VPS-VA Series (旭ビタブレン)',
    maker: '旭化成',
    type: 'dialyzer',
    jsdtClass: 'S',
    material: 'Vit.E固定化PS',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['ビタミンE固定化', '中分子除去向上', '抗酸化作用'],
    specs: { 
      1.5: { area: 1.5, ufr: 61, vol: 88, clearance: { ure: 194, b12: 141, phos: 183 } },
      2.1: { area: 2.1, ufr: 81, vol: 119, clearance: { ure: 198, b12: 159, phos: 191 } }
    }
  },
   
  // ====================
  //      TORAY (HD)
  // ====================
  {
    id: 'toray-nv-s',
    name: 'NV-S (トレライトNV)',
    maker: '東レ',
    type: 'dialyzer',
    jsdtClass: 'Ⅰa',
    material: 'PS (親水化/NVポリマー)',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['抗血栓性', '生体適合性', '吸着水制御'],
    specs: { 
      1.3: { area: 1.3, ufr: 35, vol: 82, clearance: { ure: 180, b2mg: 20 } },
      1.8: { area: 1.8, ufr: 45, vol: 108, clearance: { ure: 190, b2mg: 25 } }
    }
  },
  {
    id: 'toray-nv-u',
    name: 'NV-U (トレライトNV)',
    maker: '東レ',
    type: 'dialyzer',
    jsdtClass: 'Ⅰa',
    material: 'PS (親水化/NVポリマー)',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['抗血栓性', '中分子除去バランス'],
    specs: { 
      1.3: { area: 1.3, ufr: 46, vol: 84, clearance: { ure: 188, b2mg: 30 } },
      1.8: { area: 1.8, ufr: 52, vol: 111, clearance: { ure: 198, b2mg: 40 } }
    }
  },
  {
    id: 'toray-nv-x',
    name: 'NV-X (トレライトNV)',
    maker: '東レ',
    type: 'dialyzer',
    jsdtClass: 'Ⅱa',
    material: 'PS (親水化/NVポリマー)',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['抗血栓性', 'IIa型', '除去性能向上'],
    specs: { 
      1.5: { area: 1.5, ufr: 49, vol: 96, clearance: { ure: 197, b2mg: 40, b12: 158 } },
      2.1: { area: 2.1, ufr: 54, vol: 130, clearance: { ure: 199, b2mg: 50, b12: 173 } }
    }
  },
  {
    id: 'toray-nf',
    name: 'フィルトライザー NF',
    maker: '東レ',
    type: 'dialyzer',
    jsdtClass: 'S',
    material: 'PMMA (吸着特性)',
    pvp: '-',
    bpa: '-',
    sterilization: 'γ線',
    features: ['PMMA膜', '蛋白吸着', '抗炎症'],
    specs: { 
      1.6: { area: 1.6, ufr: 48, vol: 103, clearance: { ure: 190, b2mg: 60 } },
      2.1: { area: 2.1, ufr: 59, vol: 135, clearance: { ure: 196, b2mg: 70 } }
    }
  },
  {
    id: 'toray-bg',
    name: 'フィルトライザー BG',
    maker: '東レ',
    type: 'dialyzer',
    jsdtClass: 'S',
    material: 'PMMA (弱カチオン)',
    pvp: '-',
    bpa: '-',
    sterilization: 'γ線',
    features: ['弱カチオン性', 'サイトカイン吸着'],
    specs: { 
      1.6: { area: 1.6, ufr: 40, vol: 103, clearance: { ure: 188, b2mg: 55 } },
      2.1: { area: 2.1, ufr: 55, vol: 135, clearance: { ure: 195, b2mg: 65 } }
    }
  },
  {
    id: 'toray-bk',
    name: 'フィルトライザー BK',
    maker: '東レ',
    type: 'dialyzer',
    jsdtClass: 'S',
    material: 'PMMA',
    pvp: '-',
    bpa: '-',
    sterilization: 'γ線',
    features: ['生体適合性', '標準的PMMA'],
    specs: { 
      1.3: { area: 1.3, ufr: 27, vol: 83, clearance: { ure: 175 } },
      1.6: { area: 1.6, ufr: 31, vol: 103, clearance: { ure: 184 } }
    }
  },

  // ====================
  //      NIKKISO (HD)
  // ====================
  {
    id: 'nikkiso-fdx',
    name: 'FDX',
    maker: '日機装',
    type: 'dialyzer',
    jsdtClass: 'Ⅰa',
    material: 'PEPA',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['PEPA膜', '高強度', 'ウェットタイプ'],
    specs: { 
      1.5: { area: 1.5, ufr: 40, vol: 90, clearance: { ure: 188, b2mg: 25 } },
      2.1: { area: 2.1, ufr: 55, vol: 130, clearance: { ure: 195, b2mg: 35 } }
    }
  },
  {
    id: 'nikkiso-fdy',
    name: 'FDY',
    maker: '日機装',
    type: 'dialyzer',
    jsdtClass: 'Ⅰa',
    material: 'PEPA',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['PEPA膜', '小分子除去', 'ウェットタイプ'],
    specs: { 
      1.5: { area: 1.5, ufr: 45, vol: 90, clearance: { ure: 192, b2mg: 30 } }
    }
  },
  {
    id: 'nikkiso-fdw',
    name: 'FDW',
    maker: '日機装',
    type: 'dialyzer',
    jsdtClass: 'Ⅱa',
    material: 'PEPA',
    pvp: '-',
    bpa: '○',
    sterilization: 'γ線',
    features: ['PVPフリー', '中分子除去', 'ウェットタイプ'],
    specs: { 
      1.5: { area: 1.5, ufr: 55, vol: 90, clearance: { ure: 195, b2mg: 45 } }
    }
  },
  {
    id: 'nikkiso-fdz',
    name: 'FDZ',
    maker: '日機装',
    type: 'dialyzer',
    jsdtClass: 'Ⅱb',
    material: 'PEPA',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['高機能型', 'β2-MG高除去'],
    specs: { 
      1.5: { area: 1.5, ufr: 65, vol: 90, clearance: { ure: 198, b2mg: 60 } }
    }
  },
  {
    id: 'nikkiso-flx',
    name: 'FLX',
    maker: '日機装',
    type: 'dialyzer',
    jsdtClass: 'Ⅰa',
    material: 'PEPA (PVPフリー)',
    pvp: '-',
    bpa: '○',
    sterilization: 'γ線',
    features: ['PVPフリー', '抗酸化性', 'ウェットタイプ'],
    specs: { 
      1.5: { area: 1.5, ufr: 45, vol: 90, clearance: { ure: 190, b2mg: 20 } }
    }
  },
  {
    id: 'nikkiso-fx',
    name: 'FX',
    maker: '日機装 (Fresenius)',
    type: 'dialyzer',
    jsdtClass: 'Ⅰa',
    material: 'PS (Helixone)',
    pvp: '○',
    bpa: '○',
    sterilization: 'AC',
    features: ['Helixone膜', 'インライン蒸気滅菌', 'ドライタイプ'],
    specs: { 
      1.4: { area: 1.4, ufr: 48, vol: 74, clearance: { ure: 193, b2mg: 30 } },
      1.8: { area: 1.8, ufr: 59, vol: 98, clearance: { ure: 197, b2mg: 40 } }
    }
  },
  {
    id: 'nikkiso-fx-s',
    name: 'FX-S / CorDiax',
    maker: '日機装 (Fresenius)',
    type: 'dialyzer',
    jsdtClass: 'Ⅱa',
    material: 'PS (Helixone)',
    pvp: '○',
    bpa: '○',
    sterilization: 'AC',
    features: ['Helixone Plus', '中分子除去強化'],
    specs: { 
      1.4: { area: 1.4, ufr: 55, vol: 74, clearance: { ure: 195, b2mg: 55 } },
      1.8: { area: 1.8, ufr: 68, vol: 98, clearance: { ure: 198, b2mg: 65 } }
    }
  },

  // ====================
  //      NIPRO (HDF)
  // ====================
  {
    id: 'nipro-fix-e-eco',
    name: 'FIX-E eco (ファインフラックス)',
    maker: 'ニプロ',
    type: 'hemodiafilter',
    hdfClass: 'Alb低漏出',
    material: 'CTA',
    pvp: '-',
    bpa: '-',
    sterilization: 'γ線',
    features: ['HDF用', 'PVPフリー', 'BPAフリー', 'Albロス抑制'],
    specs: { 
      1.5: { area: 1.5, ufr: 65, vol: 90, clearance: { ure: 195, b2mg: 65 } },
      2.1: { area: 2.1, ufr: 81, vol: 125, clearance: { ure: 200, b2mg: 75 } }
    }
  },
  {
    id: 'nipro-fix-s-eco',
    name: 'FIX-S eco (ファインフラックス)',
    maker: 'ニプロ',
    type: 'hemodiafilter',
    hdfClass: 'Alb低漏出',
    material: 'CTA',
    pvp: '-',
    bpa: '-',
    sterilization: 'γ線',
    features: ['小分子除去重視', 'マイルドHDF'],
    specs: { 
      1.5: { area: 1.5, ufr: 50, vol: 90, clearance: { ure: 190, b2mg: 50 } }
    }
  },
  {
    id: 'nipro-fix-u-eco',
    name: 'FIX-U eco (ファインフラックス)',
    maker: 'ニプロ',
    type: 'hemodiafilter',
    hdfClass: 'Alb高漏出',
    material: 'CTA',
    pvp: '-',
    bpa: '-',
    sterilization: 'γ線',
    features: ['大孔径', '高効率HDF', '大量液置換対応'],
    specs: { 
      2.1: { area: 2.1, ufr: 90, vol: 125, clearance: { ure: 202, b2mg: 82 } }
    }
  },
  {
    id: 'nipro-mfx-w-eco',
    name: 'MFX-W eco (マキシフラックス)',
    maker: 'ニプロ',
    type: 'hemodiafilter',
    hdfClass: 'Alb中漏出',
    material: 'PES',
    pvp: '○',
    bpa: '-',
    sterilization: 'γ線',
    features: ['PES膜HDF', '高透水性', 'BPAフリー'],
    specs: { 
      1.5: { area: 1.5, ufr: 60, vol: 93, clearance: { ure: 193, b2mg: 70 } },
      2.1: { area: 2.1, ufr: 75, vol: 128, clearance: { ure: 199, b2mg: 78 } }
    }
  },
  // ====================
  //      ASAHI KASEI (HDF)
  // ====================
  {
    id: 'asahi-abh-pa',
    name: 'ABH-PA Series',
    maker: '旭化成',
    type: 'hemodiafilter',
    hdfClass: 'Alb中漏出',
    material: 'PS (ポリスルホン)',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['大膜面積(2.6㎡)あり', '低分子量蛋白除去', '高透水性'],
    specs: { 
      1.5: { area: 1.5, ufr: 77, vol: 92, clearance: { ure: 239, b12: 158, phos: 216 } },
      2.2: { area: 2.2, ufr: 108, vol: 131, clearance: { ure: 244, b12: 183, phos: 230 } }
    }
  },
  {
    id: 'asahi-v-ta',
    name: 'V-TA Series (ヴィエラ)',
    maker: '旭化成',
    type: 'hemodiafilter',
    hdfClass: 'Alb低漏出',
    material: 'Vit.E固定化PS',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['ビタミンE固定化', 'Alb漏出抑制', '抗酸化作用'],
    specs: { 
      1.5: { area: 1.5, ufr: 64, vol: 92, clearance: { ure: 241, b12: 168, phos: 221 } },
      2.2: { area: 2.2, ufr: 93, vol: 131, clearance: { ure: 248, b12: 200, phos: 239 } }
    }
  },
  {
    id: 'asahi-v-ra',
    name: 'V-RA Series (ヴィエラ)',
    maker: '旭化成',
    type: 'hemodiafilter',
    hdfClass: 'Alb中漏出',
    material: 'Vit.E固定化PS',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['ビタミンE固定化', 'ABHの除去性能継承', '抗酸化作用'],
    specs: { 
      1.5: { area: 1.5, ufr: 73, vol: 92, clearance: { ure: 239, b12: 169, phos: 221 } },
      2.2: { area: 2.2, ufr: 102, vol: 131, clearance: { ure: 248, b12: 199, phos: 240 } }
    }
  },
  // ====================
  //      TORAY (HDF)
  // ====================
  {
    id: 'toray-nvf-m',
    name: 'NVF-M',
    maker: '東レ',
    type: 'hemodiafilter',
    hdfClass: 'Alb低漏出',
    material: 'PS (親水化)',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['モイストタイプ', '低漏出', '抗血栓性'],
    specs: { 
      1.5: { area: 1.5, ufr: 66, vol: 96, clearance: { ure: 242, b2mg: 70 } },
      2.1: { area: 2.1, ufr: 71, vol: 130, clearance: { ure: 247, b2mg: 80 } }
    }
  },
  {
    id: 'toray-nvf-h',
    name: 'NVF-H',
    maker: '東レ',
    type: 'hemodiafilter',
    hdfClass: 'Alb中漏出',
    material: 'PS (親水化)',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['モイストタイプ', '中漏出', 'バランス'],
    specs: { 
      2.1: { area: 2.1, ufr: 80, vol: 130, clearance: { ure: 247, b2mg: 85 } }
    }
  },
  {
    id: 'toray-nvf-p',
    name: 'NVF-P',
    maker: '東レ',
    type: 'hemodiafilter',
    hdfClass: 'Alb高漏出',
    material: 'PS (親水化)',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['モイストタイプ', '高漏出', '大量液置換'],
    specs: { 
      2.1: { area: 2.1, ufr: 90, vol: 130, clearance: { ure: 248, b2mg: 90 } }
    }
  },
  {
    id: 'toray-tdf-mv',
    name: 'トレスルホン TDF-MV',
    maker: '東レ',
    type: 'hemodiafilter',
    hdfClass: 'Alb低漏出',
    material: 'PS',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['MVタイプ', '生体適合性'],
    specs: { 
      1.7: { area: 1.7, ufr: 69, vol: 108, clearance: { ure: 242, b2mg: 70 } },
      2.0: { area: 2.0, ufr: 77, vol: 130, clearance: { ure: 245, b2mg: 75 } }
    }
  },
  {
    id: 'toray-tdf-hv',
    name: 'トレスルホン TDF-HV',
    maker: '東レ',
    type: 'hemodiafilter',
    hdfClass: 'Alb中漏出',
    material: 'PS',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['HVタイプ', '高除去'],
    specs: { 
      2.0: { area: 2.0, ufr: 93, vol: 130, clearance: { ure: 247, b2mg: 85 } }
    }
  },
  {
    id: 'toray-tdf-pv',
    name: 'トレスルホン TDF-PV',
    maker: '東レ',
    type: 'hemodiafilter',
    hdfClass: 'Alb高漏出',
    material: 'PS',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['PVタイプ', '高性能'],
    specs: { 
      2.0: { area: 2.0, ufr: 100, vol: 130, clearance: { ure: 248, b2mg: 90 } }
    }
  },
  {
    id: 'toray-pmf-a',
    name: 'PMF-A',
    maker: '東レ',
    type: 'hemodiafilter',
    hdfClass: '吸着型',
    material: 'PMMA',
    pvp: '-',
    bpa: '-',
    sterilization: 'γ線',
    features: ['吸着特性', '炎症性サイトカイン吸着'],
    specs: { 
      1.6: { area: 1.6, ufr: 37, vol: 103, clearance: { ure: 222, b2mg: 60 } },
      2.1: { area: 2.1, ufr: 56, vol: 135, clearance: { ure: 232, b2mg: 70 } }
    }
  },

  // ====================
  //      NIKKISO (HDF)
  // ====================
  {
    id: 'nikkiso-gdf-m',
    name: 'GDF-M',
    maker: '日機装',
    type: 'hemodiafilter',
    hdfClass: 'Alb低漏出',
    material: 'PEPA',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['PEPA膜HDF', '低漏出', 'ウェットタイプ'],
    specs: { 
      1.5: { area: 1.5, ufr: 60, vol: 90, clearance: { ure: 196, b2mg: 65 } }
    }
  },
  {
    id: 'nikkiso-gdf',
    name: 'GDF',
    maker: '日機装',
    type: 'hemodiafilter',
    hdfClass: 'Alb高漏出',
    material: 'PEPA',
    pvp: '○',
    bpa: '○',
    sterilization: 'γ線',
    features: ['PEPA膜HDF', '高漏出', 'ウェットタイプ'],
    specs: { 
      1.5: { area: 1.5, ufr: 75, vol: 90, clearance: { ure: 198, b2mg: 75 } }
    }
  },
  {
    id: 'nikkiso-fx-hdf',
    name: 'FX-HDF',
    maker: '日機装 (Fresenius)',
    type: 'hemodiafilter',
    hdfClass: 'Alb低漏出',
    material: 'PS (Helixone)',
    pvp: '○',
    bpa: '○',
    sterilization: 'AC',
    features: ['Helixone膜', 'インライン蒸気滅菌', 'ドライタイプ'],
    specs: { 
      1.4: { area: 1.4, ufr: 62, vol: 80, clearance: { ure: 195, b2mg: 65 } },
      1.8: { area: 1.8, ufr: 80, vol: 105, clearance: { ure: 198, b2mg: 72 } }
    }
  }
];

// --- Apheresis & CRRT Devices ---
const APHERESIS_DEVICES: ApheresisDevice[] = [
  // --- CRRT ---
  {
    id: 'sepxiris',
    name: 'セプザイリス (SepXiris)',
    maker: 'バクスター',
    category: 'CRRT',
    type: '持続緩徐式血液濾過器',
    material: 'AN69ST (表面処理PAN)',
    indication: ['敗血症', '敗血症性ショック'],
    items: ['セプザイリス本体', 'CRRT回路'],
    priming: {
      steps: ['ヘパリン加生食1500mL洗浄', '濾過側の脱気注意'],
      vol_blood: '60:69mL / 100:107mL',
      vol_wash: '1500mL以上'
    },
    treatment: {
      qb: '50-200 mL/min',
      notes: ['サイトカイン(IL-6)吸着能あり', 'AN69ST膜による吸着']
    },
    finish: { method: '生食返血', vol: '500 mL' },
    insurance: 'J038-2 持続緩徐式血液濾過器'
  },
  // --- Beta2-MG Adsorption Columns ---
  {
    id: 'lixelle',
    name: 'リクセル (Lixelle)',
    maker: 'カネカ',
    category: 'COLUMN',
    type: 'β2-MG吸着カラム',
    material: 'セルロースビーズ+ヘキサデシル基',
    indication: ['透析アミロイドーシス'],
    items: ['リクセル本体', '専用接続回路'],
    priming: {
      steps: ['透析器と直列接続', '生食1000mL以上で洗浄', '気泡除去'],
      vol_blood: 'S-15:135mL / S-35:177mL',
      vol_wash: '1000mL以上'
    },
    treatment: {
      qb: '200 mL/min (透析条件に準ずる)',
      notes: ['ACE阻害薬併用注意', '開始直後の血圧低下に注意']
    },
    finish: { method: '生食返血', vol: '150-200 mL' },
    insurance: '特定保険医療材料 (β2-MG吸着器)'
  },
  {
    id: 'filtor',
    name: 'フィルトール (Filtor)',
    maker: '東レ',
    category: 'COLUMN',
    type: 'β2-MG吸着カラム',
    material: '架橋高分子',
    indication: ['透析アミロイドーシス'],
    items: ['フィルトール本体'],
    priming: {
      steps: ['透析器と直列接続', '生食洗浄'],
      vol_blood: 'FT-75:50mL / FT-145:95mL',
      vol_wash: '500-1000mL'
    },
    treatment: {
      qb: '200 mL/min',
      notes: ['β2-MGを選択的に吸着', 'タンパク吸着特性あり']
    },
    finish: { method: '生食返血', vol: '-' },
    insurance: '特定保険医療材料 (β2-MG吸着器)'
  },
  // --- DHP (Adsorption) ---
  {
    id: 'rheocarna',
    name: 'レオカーナ (Rheocarna)',
    maker: 'カネカ',
    category: 'DHP',
    type: '吸着型血液浄化器',
    material: 'セルロースビーズ(デキストラン硫酸+トリプトファン)',
    indication: ['閉塞性動脈硬化症 (潰瘍・壊疽を有する)'],
    items: ['レオカーナ本体', '血液回路'],
    priming: {
      steps: ['生食洗浄', 'ヘパリン加生食充填', '気泡除去'],
      vol_blood: '160mL',
      vol_wash: '1000mL以上'
    },
    treatment: {
      qb: '100-150 mL/min',
      notes: ['LDL及びフィブリノーゲンを吸着', '週1回・計10回まで(3ヶ月以内)', 'ACE阻害薬併用禁忌']
    },
    finish: { method: '生食返血', vol: '-' },
    insurance: '特定保険医療材料 (閉塞性動脈硬化症用)'
  },
  {
    id: 'hemosorba',
    name: 'ヘモソーバ CHS',
    maker: '旭化成',
    category: 'DHP',
    type: '血液吸着器',
    material: '活性炭 (HEMAコート)',
    indication: ['肝性昏睡', '薬物中毒'],
    items: ['ヘモソーバ本体', 'DHP回路'],
    priming: {
      steps: ['ヘパリン生食洗浄', '叩き出し推奨', '気泡除去'],
      vol_blood: '190mL',
      vol_wash: '1000mL以上'
    },
    treatment: {
      qb: '100～150 mL/min',
      notes: ['血小板減少注意', 'グルコース吸着', '3時間以内']
    },
    finish: { method: '生食返血', vol: '200mL' },
    insurance: 'J048 吸着式血液浄化用浄化器'
  },
  {
    id: 'pmx',
    name: 'トレミキシン (PMX)',
    maker: '東レ',
    category: 'DHP',
    type: 'エンドトキシン吸着カラム',
    material: 'ポリミキシンB固定化繊維',
    indication: ['エンドトキシン血症', 'グラム陰性菌感染症'],
    items: ['トレミキシン本体', 'DHP回路'],
    priming: {
      steps: ['生食洗浄', '気泡除去'],
      vol_blood: '135mL (20R)',
      vol_wash: '4000mL以上推奨 (pH調整)'
    },
    treatment: {
      qb: '80～120 mL/min',
      notes: ['2時間還流', 'SIRS基準/SOFAスコア等の要件あり']
    },
    finish: { method: '生食返血', vol: '-' },
    insurance: '特定保険医療材料 (エンドトキシン除去用)'
  },
  {
    id: 'immunopure',
    name: 'イムノピュア (Immunopure)',
    maker: '旭化成',
    category: 'DHP',
    type: '血球細胞除去用浄化器',
    material: '非晶性ポリアリレートビーズ',
    indication: ['潰瘍性大腸炎 (活動期/中等症難治例等)'],
    items: ['イムノピュア本体', '血液回路'],
    priming: {
      steps: [
        '生食2000mLで洗浄・気泡除去 (QB 100mL/min)',
        'ヘパリン加生食500mLで置換 (QB 50mL/min)'
      ],
      vol_blood: '165mL',
      vol_wash: '2000mL + 500mL'
    },
    treatment: {
      qb: '30～50 mL/min (標準)',
      time: '60分間',
      notes: ['白血球(顆粒球・単球)を選択的に吸着', '週1回・計10回まで(例外あり)']
    },
    finish: { method: '生食返血', vol: '-' },
    insurance: '特定保険医療材料 (血球細胞除去用浄化器)'
  },
  {
    id: 'adacolumn',
    name: 'アダカラム (Adacolumn)',
    maker: 'JIMRO',
    category: 'DHP',
    type: '血球細胞除去用浄化器',
    material: '酢酸セルロースビーズ',
    indication: ['潰瘍性大腸炎', 'クローン病', '膿疱性乾癬', '乾癬性関節炎', '敗血症'],
    items: ['アダカラム本体', '血液回路'],
    priming: {
      steps: [
        '生食1500mLで洗浄・空気抜き (流速100mL/min程度)',
        '抗凝固剤添加生食500mLで置換',
        'リークテスト実施'
      ],
      vol_blood: '約200mL',
      vol_wash: '1500mL + 500mL'
    },
    treatment: {
      qb: '30mL/min (UC/CD/皮膚), 50mL/min (敗血症)',
      time: '60分 (UC/CD/皮膚), 120分 (敗血症)',
      notes: [
        '顆粒球・単球を吸着除去',
        'ACE阻害薬併用注意（休薬推奨）',
        '敗血症適応追加(2025/8)',
        '白血球数減少に注意'
      ]
    },
    finish: { method: '生食返血', vol: '100-300 mL' },
    insurance: 'J041-2 血球成分除去療法 (敗血症は要件あり)'
  },
  // --- PA (Plasma Adsorption) ---
  {
    id: 'liposorber',
    name: 'リポソーバー LA-15/40S',
    maker: 'カネカ',
    category: 'PA',
    type: 'LDL吸着器',
    material: 'デキストラン硫酸固定化セルロースビーズ',
    indication: ['家族性高コレステロール血症', 'ASO', 'FGS', 'SLE'],
    items: ['リポソーバー本体', '血漿分離器', '吸着回路'],
    priming: {
      steps: ['生食洗浄', 'ヘパリン加生食充填'],
      vol_blood: 'LA-15:150mL / 40S:400mL',
      vol_wash: '1000mL以上'
    },
    treatment: {
      qb: '血漿流量 30-40 mL/min',
      notes: ['LDL-Cを選択的に吸着', 'ACE阻害薬禁忌']
    },
    finish: { method: '血漿回収', vol: '-' },
    insurance: 'J046 選択的血漿成分吸着器'
  },
  {
    id: 'selesorb',
    name: 'セレソーブ (Selesorb)',
    maker: 'カネカ',
    category: 'PA',
    type: '免疫吸着器 (SLE用)',
    material: 'デキストラン硫酸固定化セルロースビーズ',
    indication: ['全身性エリテマトーデス (SLE)'],
    items: ['セレソーブ本体', '血漿分離器'],
    priming: {
      steps: ['生食洗浄', '抗凝固薬充填'],
      vol_blood: '150mL (TS-1300)',
      vol_wash: '1000mL'
    },
    treatment: {
      qb: '血漿流量 20-30 mL/min',
      notes: ['抗DNA抗体/免疫複合体を除去', 'ACE阻害薬禁忌']
    },
    finish: { method: '血漿回収', vol: '-' },
    insurance: 'J046 選択的血漿成分吸着器'
  },
  {
    id: 'plasorba',
    name: 'プラソーバ BRS',
    maker: '旭化成',
    category: 'PA',
    type: '血漿吸着器',
    material: '陰イオン交換樹脂',
    indication: ['劇症肝炎', '術後肝不全'],
    items: ['プラソーバ本体', '血漿分離器', '吸着回路'],
    priming: {
      steps: ['生食洗浄', 'ヘパリン加生食充填'],
      vol_blood: '110mL',
      vol_wash: '1000mL'
    },
    treatment: {
      qb: '血漿流量 30～40 mL/min',
      notes: ['ビリルビン/胆汁酸吸着', 'クエン酸中毒注意']
    },
    finish: { method: '血漿押し出し', vol: '-' },
    insurance: 'J046 選択的血漿成分吸着器'
  },
  {
    id: 'immusorba',
    name: 'イムソーバ TR / PH',
    maker: '旭化成',
    category: 'PA',
    type: '免疫吸着器',
    material: 'PVAゲル+リガンド',
    indication: ['TR:MG, MS, GBS', 'PH:SLE, RA'],
    items: ['イムソーバ本体', '血漿分離器', '吸着回路'],
    priming: {
      steps: ['保存液洗浄', '抗凝固薬充填'],
      vol_blood: '300mL',
      vol_wash: '2000mL以上'
    },
    treatment: {
      qb: '血漿流量 20～30 mL/min',
      notes: ['ACE阻害薬禁忌', '自己抗体除去']
    },
    finish: { method: '血漿回収', vol: '-' },
    insurance: 'J046 免疫反応性血漿成分吸着器'
  },
  // --- PE (Plasma Separator) ---
  {
    id: 'sulflux-fp',
    name: 'サルフラックス FP (Sulflux)',
    maker: 'カネカ',
    category: 'PE',
    type: '血漿分離器',
    material: 'ポリエチレン',
    indication: ['劇症肝炎', '術後肝不全', 'TTP', '薬物中毒'],
    items: ['サルフラックス本体', 'PE回路'],
    priming: {
      steps: ['血液側・血漿側洗浄', '気泡除去'],
      vol_blood: '55-80mL',
      vol_wash: '1000mL'
    },
    treatment: {
      qb: '80-150 mL/min',
      qd: '分離速度: QBの30%以下',
      notes: ['目詰まり防止のためTMP管理重要']
    },
    finish: { method: '生食返血', vol: '-' },
    insurance: 'J044 血漿交換用血漿分離器'
  },
  {
    id: 'plasmaflo-op',
    name: 'プラズマフロー OP (Plasmaflo)',
    maker: '旭化成',
    category: 'PE',
    type: '血漿分離器',
    material: 'ポリエチレン (PE)',
    indication: ['劇症肝炎', '術後肝不全', 'TTP', '薬物中毒'],
    items: ['プラズマフロー本体', 'PE用回路', '補充液'],
    priming: {
      steps: ['血液側洗浄', '血漿側濾過洗浄', '気泡除去徹底'],
      vol_blood: 'OP-05D:55 / 08D:80',
      vol_wash: '1000mL程度'
    },
    treatment: {
      qb: '80～150 mL/min',
      qd: '分離速度: QBの30%以下',
      notes: ['TMP 60mmHg以下推奨', '目詰まり注意']
    },
    finish: { method: 'QB 50～60 mL/min', vol: '100～200 mL' },
    insurance: 'J044 血漿交換用血漿分離器'
  },
  {
    id: 'evacure-plus',
    name: 'エバキュアープラス (Evacure PLUS)',
    maker: '旭化成',
    category: 'PE',
    type: '膜型血漿分離器 (特殊)',
    material: 'EVAL (エチレンビニルアルコール)',
    indication: ['特定病因物質除去 (小・中分子)'],
    items: ['エバキュアープラス本体'],
    priming: {
      steps: ['生食洗浄・充填'],
      vol_blood: 'EC-2A10D: 50mL',
      vol_wash: '1000mL'
    },
    treatment: {
      qb: '100 mL/min',
      qd: '濾過流量 30mL/min程度',
      notes: ['小孔径', 'EVACURE療法']
    },
    finish: { method: '生食返血', vol: '-' },
    insurance: '血漿分離器として算定'
  },
  // --- DFPP ---
  {
    id: 'cascadeflo-ec',
    name: 'カスケードフロー EC',
    maker: '旭化成',
    category: 'DFPP',
    type: '血漿成分分画器',
    material: 'EVAL',
    indication: ['ABO不適合', 'MG', 'SLE', '高コレステロール血症'],
    items: ['カスケードフロー本体', 'DFPP回路'],
    priming: {
      steps: ['第2フィルタ内側洗浄', '濾過洗浄', '気泡厳禁'],
      vol_blood: '約150mL',
      vol_wash: '2000mL'
    },
    treatment: {
      qb: '血漿流量 20～30 mL/min',
      notes: ['20W(高分子), 30W(中高), 40W/50W(LDL)', '間欠洗浄推奨']
    },
    finish: { method: '膜内血漿回収', vol: '-' },
    insurance: 'J045 血漿成分分離器'
  },
  // --- CRRT (CBP) ---
  {
    id: 'cureflo-a',
    name: 'キュアフローA (CUREFLO-A)',
    maker: '旭化成',
    category: 'CRRT',
    type: '持続緩徐式血液濾過器',
    material: 'ポリスルホン (内径200μm)',
    indication: ['敗血症', '多臓器不全', '急性膵炎', '急性腎障害(AKI)'],
    items: ['キュアフローA本体', 'CRRT用回路', '補液', '抗凝固薬'],
    priming: {
      steps: ['血液側生食1000mL洗浄', '濾過500mL以上(親水化)'],
      vol_blood: 'ACF-06A:43 / 12A:75',
      vol_wash: '1500mL以上'
    },
    treatment: {
      qb: '60～100 mL/min',
      qd: '病態による',
      notes: ['圧力損失低減', '外周ウレタン部縮小']
    },
    finish: { method: '生食返血', vol: '200～300 mL' },
    insurance: 'J038-2 持続緩徐式血液濾過器'
  },
  {
    id: 'vilife',
    name: 'ヴィライフ (VILIFE)',
    maker: '旭化成',
    category: 'CRRT',
    type: '持続緩徐式血液濾過器',
    material: 'ビタミンE固定化ポリスルホン',
    indication: ['敗血症', '多臓器不全', 'AKI'],
    items: ['ヴィライフ本体', 'CRRT回路'],
    priming: {
      steps: ['生食1000mL以上洗浄', '濾過操作'],
      vol_blood: 'VL-06:45 / VL-12:75',
      vol_wash: '1500mL以上'
    },
    treatment: {
      qb: '50～150 mL/min',
      notes: ['Vit.E抗酸化作用', '血小板付着抑制']
    },
    finish: { method: '生食返血', vol: '-' },
    insurance: 'J038-2 持続緩徐式血液濾過器'
  },
  // --- CART (NEW) ---
  {
    id: 'cart-ahf',
    name: 'AHF-MOW / AHF-UF',
    maker: '旭化成',
    category: 'CART',
    type: '腹水濾過・濃縮器',
    material: 'ポリスルホン等',
    indication: ['難治性腹水症', '胸水症'],
    items: ['AHF-MOW(濾過器)', 'AHF-UF(濃縮器)', 'CART回路', '貯留バッグ'],
    priming: {
      steps: ['各器を生食洗浄', 'リークテスト実施(重要)'],
      vol_blood: '-',
      vol_wash: '各1000mL程度'
    },
    treatment: {
      qb: '採取速度 1000～2000 mL/h',
      notes: [
        'MOW: 細菌・癌細胞除去',
        'UF: タンパク濃縮',
        '再静注は輸血セット使用',
        '発熱・エンドトキシン注意'
      ]
    },
    finish: { method: 'エアー回収', vol: '-' },
    insurance: 'K635 胸水・腹水濾過濃縮再静注法'
  },
  {
    id: 'masscure',
    name: 'マスキュア (Masscure)',
    maker: 'カネカ',
    category: 'CART',
    type: '腹水濾過・濃縮フィルタ',
    material: '濾過:PS / 濃縮:PES',
    indication: ['難治性腹水・胸水'],
    items: ['マスキュア腹水濾過フィルタ', 'マスキュア腹水濃縮フィルタ'],
    priming: {
      steps: ['生食洗浄', 'リークテスト'],
      vol_blood: '-',
      vol_wash: '1000-2000mL'
    },
    treatment: {
      qb: '採取速度 1000-2000 mL/h',
      notes: ['腫瘍細胞・細菌除去', '高TP腹水対応', '目詰まり抑制設計']
    },
    finish: { method: 'エアー回収', vol: '-' },
    insurance: 'K635 胸水・腹水濾過濃縮再静注法'
  }
];

// --- Components ---

const Header = ({ reset, showBack, goBack }: { reset: () => void, showBack: boolean, goBack: () => void }) => (
  <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg sticky top-0 z-50">
    <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition" onClick={reset}>
        <Activity className="w-6 h-6 text-teal-400" />
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-wide">CE Assist <span className="text-teal-400">Pro</span></h1>
          <p className="text-[10px] text-gray-400">血液浄化業務支援・教育システム V10</p>
        </div>
      </div>
      {showBack && (
        <button onClick={goBack} className="flex items-center text-sm bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition font-medium">
          <ArrowLeft className="w-4 h-4 mr-1" /> 戻る
        </button>
      )}
    </div>
  </header>
);

const TileButton = ({ title, sub, icon, onClick, color = "blue" }: any) => (
  <button 
    onClick={onClick}
    className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 group text-left w-full h-full flex flex-col justify-between
      ${color === 'blue' ? 'bg-blue-50 border-blue-100 hover:border-blue-500 hover:shadow-blue-200/50' : ''}
      ${color === 'teal' ? 'bg-teal-50 border-teal-100 hover:border-teal-500 hover:shadow-teal-200/50' : ''}
      ${color === 'indigo' ? 'bg-indigo-50 border-indigo-100 hover:border-indigo-500 hover:shadow-indigo-200/50' : ''}
      ${color === 'rose' ? 'bg-rose-50 border-rose-100 hover:border-rose-500 hover:shadow-rose-200/50' : ''}
      hover:shadow-xl hover:-translate-y-1
    `}
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl 
        ${color === 'blue' ? 'bg-blue-200 text-blue-700' : ''}
        ${color === 'teal' ? 'bg-teal-200 text-teal-700' : ''}
        ${color === 'indigo' ? 'bg-indigo-200 text-indigo-700' : ''}
        ${color === 'rose' ? 'bg-rose-200 text-rose-700' : ''}
      `}>
        {icon}
      </div>
    </div>
    <div>
      <h3 className="font-bold text-xl text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 font-medium">{sub}</p>
    </div>
  </button>
);

const ComparisonTool = ({ db }: { db: DialyzerSeries[] }) => {
  const [sourceMaker, setSourceMaker] = useState('');
  const [sourceSeries, setSourceSeries] = useState<DialyzerSeries | null>(null);
  const [sourceSize, setSourceSize] = useState<string>('');

  const [targetMaker, setTargetMaker] = useState('');
  const [targetSeries, setTargetSeries] = useState<DialyzerSeries | null>(null);
  const [targetSize, setTargetSize] = useState<string>('');

  const makers = Array.from(new Set(db.map(d => d.maker)));

  const handleSourceSeriesChange = (seriesId: string) => {
    const s = db.find(d => d.id === seriesId) || null;
    setSourceSeries(s);
    if(s) {
      // Default size logic: try to find 1.5, then closest
      const sizes = Object.keys(s.specs);
      const def = sizes.find(sz => sz === '1.5') || sizes[0];
      setSourceSize(def);
    } else {
      setSourceSize('');
    }
  };

  const handleTargetSeriesChange = (seriesId: string) => {
    const s = db.find(d => d.id === seriesId) || null;
    setTargetSeries(s);
    if(s) {
      const sizes = Object.keys(s.specs);
      const def = sizes.find(sz => sz === '1.5') || sizes[0];
      setTargetSize(def);
    } else {
      setTargetSize('');
    }
  };

  const renderSpecRow = (label: string, val1: any, val2: any, unit: string = '') => (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-slate-50 transition">
      <td className="py-3 px-2 text-xs font-bold text-gray-500 w-1/3">{label}</td>
      <td className={`py-3 px-2 text-sm text-center w-1/3 font-medium ${val1 && val2 && val1 > val2 ? 'text-blue-600' : ''}`}>{val1 ?? '-'} <span className="text-[10px] text-gray-400">{unit}</span></td>
      <td className={`py-3 px-2 text-sm text-center w-1/3 font-medium ${val2 && val1 && val2 > val1 ? 'text-rose-600' : ''}`}>{val2 ?? '-'} <span className="text-[10px] text-gray-400">{unit}</span></td>
    </tr>
  );

  const getSpec = (series: DialyzerSeries | null, sizeStr: string) => {
    if(!series || !sizeStr) return null;
    const sz = parseFloat(sizeStr);
    return series.specs[sz];
  };

  const sSpec = getSpec(sourceSeries, sourceSize);
  const tSpec = getSpec(targetSeries, targetSize);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col h-full">
      <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
        <ArrowRightLeft className="w-5 h-5 mr-2 text-indigo-600" />
        製品スペック比較 (シミュレーション)
      </h3>

      {/* Selectors Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Source Side */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
          <div className="text-xs font-bold text-blue-800 mb-2 text-center bg-blue-200 rounded py-1">現状 (Current)</div>
          <select className="w-full mb-2 p-1 text-xs border rounded" value={sourceMaker} onChange={e=>setSourceMaker(e.target.value)}>
            <option value="">メーカー選択</option>
            {makers.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select className="w-full mb-2 p-1 text-xs border rounded" disabled={!sourceMaker} onChange={e=>handleSourceSeriesChange(e.target.value)}>
            <option value="">製品選択</option>
            {db.filter(d=>d.maker===sourceMaker).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {sourceSeries && (
            <select className="w-full p-1 text-xs border rounded font-bold text-blue-900" value={sourceSize} onChange={e=>setSourceSize(e.target.value)}>
              {Object.keys(sourceSeries.specs).map(sz => <option key={sz} value={sz}>{sz} ㎡/type</option>)}
            </select>
          )}
        </div>

        {/* Target Side */}
        <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
          <div className="text-xs font-bold text-rose-800 mb-2 text-center bg-rose-200 rounded py-1">検討 (Target)</div>
          <select className="w-full mb-2 p-1 text-xs border rounded" value={targetMaker} onChange={e=>setTargetMaker(e.target.value)}>
            <option value="">メーカー選択</option>
            {makers.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select className="w-full mb-2 p-1 text-xs border rounded" disabled={!targetMaker} onChange={e=>handleTargetSeriesChange(e.target.value)}>
            <option value="">製品選択</option>
            {db.filter(d=>d.maker===targetMaker).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {targetSeries && (
            <select className="w-full p-1 text-xs border rounded font-bold text-rose-900" value={targetSize} onChange={e=>setTargetSize(e.target.value)}>
              {Object.keys(targetSeries.specs).map(sz => <option key={sz} value={sz}>{sz} ㎡/type</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-y-auto flex-grow border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="py-2 px-2 text-xs text-left text-gray-500 font-normal">項目</th>
              <th className="py-2 px-2 text-xs text-center font-bold text-blue-800 bg-blue-50 w-1/3 truncate">{sourceSeries?.name || '-'}</th>
              <th className="py-2 px-2 text-xs text-center font-bold text-rose-800 bg-rose-50 w-1/3 truncate">{targetSeries?.name || '-'}</th>
            </tr>
          </thead>
          <tbody>
            {renderSpecRow('分類', sourceSeries?.type === 'hemodiafilter' ? 'HDF' : 'HD', targetSeries?.type === 'hemodiafilter' ? 'HDF' : 'HD')}
            {renderSpecRow('膜素材', sourceSeries?.material, targetSeries?.material)}
            {renderSpecRow('機能分類', sourceSeries?.jsdtClass || sourceSeries?.hdfClass, targetSeries?.jsdtClass || targetSeries?.hdfClass)}
            {renderSpecRow('膜面積', sourceSize, targetSize, '㎡')}
            {renderSpecRow('UFR', sSpec?.ufr, tSpec?.ufr, 'mL/hr/mmHg')}
            {renderSpecRow('プライミング', sSpec?.vol, tSpec?.vol, 'mL')}
            <tr className="bg-slate-50"><td colSpan={3} className="py-1 px-2 text-[10px] font-bold text-gray-400 text-center">クリアランス (QB=200, QD=500)</td></tr>
            {renderSpecRow('尿素 (Urea)', sSpec?.clearance.ure, tSpec?.clearance.ure, 'mL/min')}
            {renderSpecRow('リン (Phos)', sSpec?.clearance.phos, tSpec?.clearance.phos, 'mL/min')}
            {renderSpecRow('β2-MG', sSpec?.clearance.b2mg, tSpec?.clearance.b2mg, 'mL/min')}
            {renderSpecRow('Vit.B12', sSpec?.clearance.b12, tSpec?.clearance.b12, 'mL/min')}
          </tbody>
        </table>
      </div>
      {(sSpec || tSpec) && (
        <div className="mt-3 text-[10px] text-gray-400 text-right">
          ※数値はカタログ代表値またはシミュレーション値です。<br/>
          ※実際の生体性能は条件により異なります。
        </div>
      )}
    </div>
  );
};

const DialyzerDetail = ({ series }: { series: DialyzerSeries }) => {
  const [size, setSize] = useState<number>(Object.keys(series.specs).map(Number).sort()[0]);
  const spec = series.specs[size];

  // spKt/V Calculator
  const [calc, setCalc] = useState({ pre: '', post: '', weight: '', time: '', uf: '' });
  const [ktv, setKtv] = useState<string | null>(null);

  const calculateKtv = () => {
    const pre = parseFloat(calc.pre);
    const post = parseFloat(calc.post);
    const w = parseFloat(calc.weight);
    const t = parseFloat(calc.time);
    const uf = parseFloat(calc.uf);
    if(pre && post && w && t) {
      const R = post / pre;
      const res = -Math.log(R - 0.008 * t) + (4 - 3.5 * R) * (uf / w);
      setKtv(res.toFixed(2));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-fade-in-up">
      <div className="bg-slate-50 p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <span className={`text-xs font-bold px-2 py-1 rounded text-white ${series.type === 'hemodiafilter' ? 'bg-teal-600' : 'bg-blue-600'}`}>
              {series.type === 'hemodiafilter' ? 'HDF' : 'HD'}
            </span>
            <span className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-700">{series.maker}</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">{series.name}</h2>
        </div>
        <div className="text-center flex flex-col gap-2">
          {series.jsdtClass && (
             <div className="px-3 py-1 rounded-full bg-slate-800 text-white font-bold shadow-lg text-lg">
               {series.jsdtClass}型
             </div>
          )}
          {series.hdfClass && (
             <div className="px-3 py-1 rounded-full bg-teal-600 text-white font-bold shadow-lg text-sm">
               {series.hdfClass}
             </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-3">膜面積 (Surface Area)</label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(series.specs).map(Number).sort((a,b)=>a-b).map(s => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`px-5 py-2 rounded-lg font-bold transition-all text-sm ${size === s ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {s < 10 ? s.toFixed(1) + ' ㎡' : `H12-${s}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
             <h3 className="font-bold text-gray-700 mb-4 flex items-center border-b pb-2"><Activity className="w-5 h-5 mr-2 text-blue-500"/> スペック詳細</h3>
             <table className="w-full text-sm">
               <tbody>
                 <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">膜素材</td><td className="py-3 font-medium text-right">{series.material}</td></tr>
                 <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">PVP (親水化剤)</td><td className="py-3 font-medium text-right">{series.pvp === '○' ? '含有あり' : 'なし'}</td></tr>
                 <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">BPA (溶出)</td><td className="py-3 font-medium text-right">{series.bpa === '○' ? 'あり' : 'なし'}</td></tr>
                 <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">滅菌方法</td><td className="py-3 font-medium text-right">{series.sterilization}</td></tr>
                 <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">UFR (mL/hr/mmHg)</td><td className="py-3 font-bold text-right text-lg">{spec.ufr}</td></tr>
                 <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">プライミング量 (mL)</td><td className="py-3 font-medium text-right">{spec.vol}</td></tr>
                 <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">Clearance Urea</td><td className="py-3 font-medium text-right">{spec.clearance.ure}</td></tr>
                 {spec.clearance.phos && <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">Clearance Phos</td><td className="py-3 font-medium text-right">{spec.clearance.phos}</td></tr>}
                 {spec.clearance.b2mg && <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">Clearance β2-MG</td><td className="py-3 font-medium text-right">{spec.clearance.b2mg}</td></tr>}
                 {spec.clearance.b12 && <tr className="border-b border-gray-100"><td className="py-3 text-gray-500">Clearance Vit.B12</td><td className="py-3 font-medium text-right">{spec.clearance.b12}</td></tr>}
               </tbody>
             </table>
             <p className="text-xs text-gray-400 mt-2 text-right">※数値は代表値またはシミュレーション値です</p>
          </div>
           
          <div className="space-y-6">
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-3 flex items-center"><Info className="w-4 h-4 mr-2"/> 特徴</h3>
              <ul className="space-y-2">
                {series.features.map((f,i) => (
                  <li key={i} className="flex items-start text-sm text-blue-900">
                    <CheckCircle className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0 mt-0.5"/> {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h4 className="font-bold text-xs text-gray-500 uppercase mb-3 flex items-center"><Calculator className="w-4 h-4 mr-2"/> spKt/V シミュレータ</h4>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <input placeholder="前BUN" type="number" className="p-2 text-sm border rounded" value={calc.pre} onChange={e=>setCalc({...calc, pre:e.target.value})}/>
                <input placeholder="後BUN" type="number" className="p-2 text-sm border rounded" value={calc.post} onChange={e=>setCalc({...calc, post:e.target.value})}/>
                <input placeholder="体重(kg)" type="number" className="p-2 text-sm border rounded" value={calc.weight} onChange={e=>setCalc({...calc, weight:e.target.value})}/>
                <input placeholder="時間(h)" type="number" className="p-2 text-sm border rounded" value={calc.time} onChange={e=>setCalc({...calc, time:e.target.value})}/>
                <input placeholder="除水(L)" type="number" className="p-2 text-sm border rounded" value={calc.uf} onChange={e=>setCalc({...calc, uf:e.target.value})}/>
                <button onClick={calculateKtv} className="bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition">計算</button>
              </div>
              {ktv && <div className="text-center font-bold text-blue-700 bg-blue-100 p-2 rounded border border-blue-200">spKt/V = <span className="text-xl">{ktv}</span></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApheresisModal = ({ device, onClose }: { device: ApheresisDevice, onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'prime' | 'treat'>('basic');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-rose-600 text-white p-6 flex justify-between items-start flex-shrink-0">
          <div>
            <div className="text-rose-200 text-sm font-bold uppercase tracking-wider mb-1">{device.type}</div>
            <h2 className="text-2xl font-bold">{device.name}</h2>
            <div className="text-xs mt-1 bg-white/20 inline-block px-2 py-0.5 rounded">{device.maker}</div>
          </div>
          <button onClick={onClose} className="p-2 bg-rose-700 hover:bg-rose-800 rounded-full transition"><X className="w-5 h-5"/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
          {[
            { id: 'basic', label: '基本情報・物品', icon: Info },
            { id: 'prime', label: '洗浄・充填 (マニュアル)', icon: Beaker },
            { id: 'treat', label: '治療条件・返血', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 font-bold text-sm flex items-center justify-center transition-all ${activeTab === tab.id ? 'bg-white text-rose-600 border-t-4 border-rose-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-grow bg-white">
           
          {activeTab === 'basic' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-rose-50 p-5 rounded-xl border border-rose-100">
                  <h3 className="font-bold text-rose-800 mb-3">適応疾患</h3>
                  <ul className="list-disc ml-5 space-y-1 text-rose-900">
                    {device.indication.map((ind, i) => <li key={i}>{ind}</li>)}
                  </ul>
                </div>
                {device.contraindication && (
                  <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-100">
                    <h3 className="font-bold text-yellow-800 mb-3 flex items-center"><AlertOctagon className="w-4 h-4 mr-2"/> 禁忌・注意</h3>
                    <ul className="list-disc ml-5 space-y-1 text-yellow-900">
                      {device.contraindication.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">必要物品リスト</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {device.items.map((item, i) => (
                      <div key={i} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm font-medium text-gray-700 flex items-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                   <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">デバイス仕様</h3>
                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                     <p className="mb-2"><span className="font-bold text-slate-500">膜/吸着剤素材:</span><br/> {device.material}</p>
                   </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                <span className="font-bold">保険適用:</span> {device.insurance}
              </div>
            </div>
          )}

          {activeTab === 'prime' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold flex items-center"><Beaker className="w-6 h-6 mr-2 text-yellow-400"/> 洗浄・充填手順</h3>
                  <div className="text-xs bg-gray-700 px-3 py-1 rounded">Manual based</div>
                </div>
                <div className="space-y-4">
                  {device.priming.steps.map((step, i) => (
                    <div key={i} className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-yellow-500 text-black font-bold flex items-center justify-center mr-4 flex-shrink-0">
                        {i + 1}
                      </div>
                      <p className="pt-1 text-lg">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
               
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-100 p-5 rounded-xl border border-gray-200 text-center">
                  <div className="text-sm text-gray-500 font-bold mb-1">プライミング洗浄液量</div>
                  <div className="text-3xl font-bold text-gray-800">{device.priming.vol_wash}</div>
                  <div className="text-xs text-rose-500 mt-2 font-bold">※不足するとpH異常や溶出物の危険あり</div>
                </div>
                <div className="bg-gray-100 p-5 rounded-xl border border-gray-200 text-center">
                  <div className="text-sm text-gray-500 font-bold mb-1">カラム充填量 (Blood Volume)</div>
                  <div className="text-3xl font-bold text-gray-800">{device.priming.vol_blood}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'treat' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">治療条件 (標準設定)</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">血流速度 (QB)</span>
                      <span className="font-bold text-xl">{device.treatment.qb}</span>
                    </div>
                    {device.treatment.qd && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">処理速度 (QD/QS)</span>
                        <span className="font-bold text-xl">{device.treatment.qd}</span>
                      </div>
                    )}
                    {device.treatment.time && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">治療時間</span>
                        <span className="font-bold text-xl">{device.treatment.time}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                   <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">終了・返血手順</h3>
                   <div className="text-gray-800">
                     <p className="font-bold mb-2">{device.finish.method}</p>
                     <div className="text-sm text-gray-500">使用生食量: <span className="text-gray-800 font-bold">{device.finish.vol}</span></div>
                   </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
                <h3 className="font-bold text-yellow-800 mb-2 flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/> 臨床上の注意点</h3>
                <ul className="list-disc ml-5 space-y-2 text-yellow-900 font-medium">
                  {device.treatment.notes.map((n,i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReimbursementModal = ({ type, onClose }: { type: ApheresisType | 'COLUMN', onClose: () => void }) => {
  const data = REIMBURSEMENT_INFO[type as keyof typeof REIMBURSEMENT_INFO];
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="bg-emerald-700 text-white p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center">
            <FileSpreadsheet className="w-6 h-6 mr-2" />
            診療報酬・算定要件
          </h2>
          <button onClick={onClose} className="p-2 bg-emerald-800 hover:bg-emerald-900 rounded-full transition"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <h3 className="text-lg font-bold text-emerald-800 mb-2">{data.title}</h3>
          <div className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">{data.points}</div>
           
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h4 className="font-bold text-gray-700 mb-3">特定保険医療材料 (材料価格)</h4>
              <ul className="space-y-2 text-sm">
                {data.material.map((m: any, i: number) => (
                  <li key={i}>
                    {m.name}: <span className="font-bold text-lg text-emerald-700">{m.price ? m.price : ''}</span>
                    {m.list && (
                      <div className="text-xs text-gray-500 mt-1 ml-2">
                        例: {m.list.join(', ')}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <h4 className="font-bold text-emerald-800 mb-3">留意事項・加算</h4>
              <ul className="list-disc ml-5 space-y-2 text-sm text-emerald-900">
                {data.notes.map((note: string, i: number) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Main App ---

export default function CEAssistantV10() {
  const [view, setView] = useState<ViewMode>('home');
  
  // Integrated Search Filters (Home Page)
  const [makerFilter, setMakerFilter] = useState<string>('');
  const [jsdtFilter, setJsdtFilter] = useState<JSDTClass | ''>('');
  const [materialFilter, setMaterialFilter] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Drill-down View State
  const [selectedApheType, setSelectedApheType] = useState<ApheresisType | 'COLUMN' | null>(null);
  const [showReimbursement, setShowReimbursement] = useState<boolean>(false);
  const [apheDiseaseFilter, setApheDiseaseFilter] = useState<string>('');

  const [selectedSeries, setSelectedSeries] = useState<DialyzerSeries | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<ApheresisDevice | null>(null);

  // Treatment View specific sub-filters
  const [treatmentSubFilter, setTreatmentSubFilter] = useState<ProductType | null>(null);
  const [hdfSubFilter, setHdfSubFilter] = useState<HDFClass | null>(null);


  const reset = () => {
    setView('home');
    setMakerFilter('');
    setJsdtFilter('');
    setMaterialFilter('');
    setIsSearchActive(false);
    setSelectedSeries(null);
    setSelectedDevice(null);
    setSelectedApheType(null);
    setShowReimbursement(false);
    setApheDiseaseFilter('');
    setTreatmentSubFilter(null);
    setHdfSubFilter(null);
  };

  const goBack = () => {
    if(selectedSeries) { setSelectedSeries(null); return; }
    if(selectedDevice) { setSelectedDevice(null); return; }
    if(view === 'apheresis_list' || view === 'column_list' || view === 'apheresis_disease') { 
      setView('apheresis_menu'); 
      setSelectedApheType(null); 
      setApheDiseaseFilter('');
      return; 
    }
    // If in detail list of Treatment View, go back to Treatment selection
    if (view === 'treatment' && treatmentSubFilter) {
      setTreatmentSubFilter(null);
      setHdfSubFilter(null);
      return; 
    }
    // If inside Manufacturer view with a filter selected
    if (view === 'manufacturer' && makerFilter) {
      setMakerFilter('');
      return;
    }
    // If inside Classification view with a filter selected
    if (view === 'classification' && jsdtFilter) {
      setJsdtFilter('');
      return;
    }

    if(view === 'manufacturer' || view === 'classification' || view === 'treatment') {
      reset(); // Go back to home completely
      return;
    }
    reset();
  };

  // --- View Switching Logic (Resets relevant filters for new context) ---
  const switchToView = (newView: ViewMode) => {
    reset(); // Clear everything first
    setView(newView);
  };

  const handleApheSelect = (type: ApheresisType) => {
    setSelectedApheType(type);
    setView('apheresis_list');
  };

  const executeSearch = () => {
    setIsSearchActive(true);
  };

  const clearSearch = () => {
    setMakerFilter('');
    setJsdtFilter('');
    setMaterialFilter('');
    setIsSearchActive(false);
  };

  // --- Filtering Logic ---

  // 1. Integrated Search (Home Page)
  const homeSearchResults = useMemo(() => {
    if (!isSearchActive || view !== 'home') return [];
    let list = DIALYZER_DB;
    if(makerFilter) list = list.filter(d => d.maker.includes(makerFilter));
    if(jsdtFilter) list = list.filter(d => d.jsdtClass === jsdtFilter);
    if(materialFilter) list = list.filter(d => d.material.includes(materialFilter));
    return list;
  }, [makerFilter, jsdtFilter, materialFilter, isSearchActive, view]);

  // 2. Manufacturer View List
  const manufacturerList = useMemo(() => {
    if (view !== 'manufacturer' || !makerFilter) return [];
    return DIALYZER_DB.filter(d => d.maker === makerFilter);
  }, [view, makerFilter]);

  // 3. Classification View List
  const classificationList = useMemo(() => {
    if (view !== 'classification' || !jsdtFilter) return [];
    return DIALYZER_DB.filter(d => d.jsdtClass === jsdtFilter);
  }, [view, jsdtFilter]);

  // 4. Treatment View List
  const treatmentList = useMemo(() => {
    if (view !== 'treatment') return [];
    let list = DIALYZER_DB;
    if (treatmentSubFilter) list = list.filter(d => d.type === treatmentSubFilter);
    if (hdfSubFilter) list = list.filter(d => d.hdfClass === hdfSubFilter);
    if (!treatmentSubFilter) return [];
    return list;
  }, [view, treatmentSubFilter, hdfSubFilter]);


  // Apheresis Logic
  const filteredDiseaseDevices = useMemo(() => {
    if (!apheDiseaseFilter) return [];
    return APHERESIS_DEVICES.filter(d => 
      d.indication.some(ind => ind.includes(apheDiseaseFilter))
    );
  }, [apheDiseaseFilter]);

  const filteredApheList = useMemo(() => {
    if (!selectedApheType) return [];
    return APHERESIS_DEVICES.filter(d => d.category === selectedApheType);
  }, [selectedApheType]);

  const filteredColumnList = useMemo(() => {
    return APHERESIS_DEVICES.filter(d => d.category === 'COLUMN');
  }, []);

  // Dropdown options
  const makers = Array.from(new Set(DIALYZER_DB.map(d => d.maker)));
  const materials = Array.from(new Set(DIALYZER_DB.map(d => d.material.split('(')[0].trim())));
  const allDiseases = Array.from(new Set(APHERESIS_DEVICES.flatMap(d => d.indication)));

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800 pb-12">
      <CustomStyles />
      <Header reset={reset} showBack={view !== 'home' || isSearchActive} goBack={goBack} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* HOME MENU: 2x2 Grid + Integrated Search + Comparison Tool */}
        {view === 'home' && !selectedSeries && (
          <div className="animate-fade-in space-y-8">
            <div className="grid grid-cols-2 gap-4 md:h-[400px]">
               <TileButton 
                 title="メーカー検索" 
                 sub="メーカー別一覧表示" 
                 icon={<Search size={32}/>} 
                 color="blue" onClick={() => switchToView('manufacturer')} 
               />
               <TileButton 
                 title="JSDT機能分類" 
                 sub="Ⅰa, Ⅰb, Ⅱa, Ⅱb, S, 特定積層" 
                 icon={<Activity size={32}/>} 
                 color="teal" onClick={() => switchToView('classification')} 
               />
               <TileButton 
                 title="治療法・膜素材" 
                 sub="HD, HDF, 膜素材別" 
                 icon={<Droplet size={32}/>} 
                 color="indigo" onClick={() => switchToView('treatment')} 
               />
               <TileButton 
                 title="アフェレシス" 
                 sub="治療法選択・マニュアル" 
                 icon={<ShieldAlert size={32}/>} 
                 color="rose" onClick={() => switchToView('apheresis_menu')} 
               />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* INTEGRATED SEARCH TOOL */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col h-full">
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <Filter className="w-5 h-5 mr-2" />
                    ダイアライザ統合検索
                  </div>
                  {isSearchActive && (
                    <button onClick={clearSearch} className="text-xs text-red-500 flex items-center hover:underline">
                      <RefreshCw className="w-3 h-3 mr-1"/> リセット
                    </button>
                  )}
                </h3>
                
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">メーカー</label>
                    <select 
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg"
                      value={makerFilter}
                      onChange={(e) => setMakerFilter(e.target.value)}
                    >
                      <option value="">指定なし</option>
                      {makers.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">JSDT機能分類</label>
                    <select 
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg"
                      value={jsdtFilter}
                      onChange={(e) => setJsdtFilter(e.target.value as any)}
                    >
                      <option value="">指定なし</option>
                      {['Ⅰa', 'Ⅰb', 'Ⅱa', 'Ⅱb', 'S', '特定積層型'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">膜素材</label>
                    <select 
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg"
                      value={materialFilter}
                      onChange={(e) => setMaterialFilter(e.target.value)}
                    >
                      <option value="">指定なし</option>
                      {materials.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <button 
                      onClick={executeSearch}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded-lg transition shadow-md flex items-center justify-center mt-2"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      検索開始
                    </button>
                  </div>
                </div>

                {/* SEARCH RESULTS */}
                {isSearchActive && (
                  <div className="animate-fade-in border-t pt-4 overflow-y-auto flex-grow h-64">
                    <div className="grid grid-cols-1 gap-2">
                      {homeSearchResults.length > 0 ? (
                        homeSearchResults.map(d => (
                          <div key={d.id} onClick={() => setSelectedSeries(d)} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition group">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-[10px] text-gray-500">{d.maker}</div>
                                <h3 className="font-bold text-sm text-gray-800 group-hover:text-blue-600">{d.name}</h3>
                              </div>
                              <ChevronRight className="text-gray-300 w-4 h-4 group-hover:text-blue-500"/>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          該当する製品が見つかりません
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* COMPARISON TOOL */}
              <ComparisonTool db={DIALYZER_DB} />
            </div>
          </div>
        )}

        {/* --- DRILL DOWN VIEW MODES (Separated Logic) --- */}
        
        {/* Manufacturer View */}
        {view === 'manufacturer' && !selectedSeries && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">メーカー別検索</h2>
            {!makerFilter ? (
              // Step 1: Select Maker
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {makers.map(m => (
                  <button key={m} onClick={() => setMakerFilter(m)} className="bg-white p-6 rounded-xl shadow hover:shadow-lg font-bold text-lg border-l-4 border-blue-500 text-left">{m}</button>
                ))}
              </div>
            ) : (
              // Step 2: Show List for Selected Maker
              <div className="animate-fade-in">
                <div className="flex items-center mb-4">
                  <h3 className="font-bold text-xl text-blue-800 bg-blue-100 px-4 py-2 rounded-lg">{makerFilter} 製品一覧</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {manufacturerList.map(d => (
                    <div key={d.id} onClick={() => setSelectedSeries(d)} className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition group">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600">{d.name}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className={`text-[10px] px-2 py-1 rounded text-white ${d.type === 'hemodiafilter' ? 'bg-teal-500' : 'bg-blue-500'}`}>{d.type === 'hemodiafilter' ? 'HDF' : 'HD'}</span>
                            {d.jsdtClass && <span className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded">{d.jsdtClass}</span>}
                          </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-blue-500"/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Classification View */}
        {view === 'classification' && !selectedSeries && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">JSDT機能分類別検索</h2>
            {!jsdtFilter ? (
              // Step 1: Select Class
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {['Ⅰa', 'Ⅰb', 'Ⅱa', 'Ⅱb', 'S', '特定積層型'].map(c => (
                  <button key={c} onClick={() => setJsdtFilter(c as JSDTClass)} className="bg-white p-6 rounded-xl shadow hover:shadow-lg font-bold text-lg border-l-4 border-teal-500 text-center">{c}</button>
                ))}
              </div>
            ) : (
              // Step 2: Show List for Selected Class
              <div className="animate-fade-in">
                <div className="flex items-center mb-4">
                  <h3 className="font-bold text-xl text-teal-800 bg-teal-100 px-4 py-2 rounded-lg">{jsdtFilter}型 製品一覧</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classificationList.map(d => (
                    <div key={d.id} onClick={() => setSelectedSeries(d)} className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition group">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">{d.maker}</div>
                          <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600">{d.name}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className={`text-[10px] px-2 py-1 rounded text-white ${d.type === 'hemodiafilter' ? 'bg-teal-500' : 'bg-blue-500'}`}>{d.type === 'hemodiafilter' ? 'HDF' : 'HD'}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded">{d.material}</span>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-blue-500"/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Treatment/Material View */}
        {view === 'treatment' && !selectedSeries && (
           <div className="animate-fade-in">
             <h2 className="text-2xl font-bold text-gray-800 mb-6">治療法・膜素材から探す</h2>
             
             {!treatmentSubFilter ? (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <button onClick={() => setTreatmentSubFilter('dialyzer')} className="bg-white border-2 border-blue-500 p-8 rounded-xl shadow-lg hover:bg-blue-50 transition text-left group">
                      <h3 className="text-2xl font-bold text-blue-800 mb-2 group-hover:text-blue-600">HD (血液透析)</h3>
                      <p className="text-gray-600">拡散主体。小分子除去効率を重視。</p>
                    </button>
                    <button onClick={() => setTreatmentSubFilter('hemodiafilter')} className="bg-white border-2 border-teal-500 p-8 rounded-xl shadow-lg hover:bg-teal-50 transition text-left group">
                      <h3 className="text-2xl font-bold text-teal-800 mb-2 group-hover:text-teal-600">HDF (血液透析濾過)</h3>
                      <p className="text-gray-600">濾過主体。アルブミン漏出特性から選択。</p>
                    </button>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-gray-600 mb-4 flex items-center">
                      <Layers className="w-5 h-5 mr-2" />
                      その他の血液浄化療法
                    </h3>
                    <button 
                      onClick={() => { setView('column_list'); setSelectedApheType('COLUMN'); }} 
                      className="w-full md:w-1/2 bg-white border-2 border-indigo-400 p-6 rounded-xl shadow-md hover:bg-indigo-50 transition text-left group flex items-center justify-between"
                    >
                      <div>
                        <h3 className="text-xl font-bold text-indigo-900 group-hover:text-indigo-700">β2-MG 吸着カラム</h3>
                        <p className="text-sm text-gray-500">透析アミロイドーシス治療 (リクセル・フィルトール)</p>
                      </div>
                      <ChevronRight className="text-indigo-300 group-hover:text-indigo-500" />
                    </button>
                  </div>
                </div>
             ) : (
                // Step 2: Refine or Show List
                <div className="animate-fade-in">
                  
                  {/* HDF Specific Filter */}
                  {treatmentSubFilter === 'hemodiafilter' && (
                    <div className="mb-6">
                      <h3 className="font-bold text-md text-gray-600 mb-2">アルブミン漏出特性で絞り込み:</h3>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => setHdfSubFilter(null)} 
                          className={`px-4 py-2 rounded-full font-bold transition ${!hdfSubFilter ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                        >
                          すべて
                        </button>
                        {['Alb低漏出', 'Alb中漏出', 'Alb高漏出'].map(c => (
                          <button 
                            key={c} 
                            onClick={() => setHdfSubFilter(c as HDFClass)} 
                            className={`px-4 py-2 rounded-full font-bold transition ${hdfSubFilter === c ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-800 hover:bg-teal-200'}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-xl text-gray-800">
                      {treatmentSubFilter === 'dialyzer' ? 'HD (血液透析) 製品一覧' : 'HDF (血液透析濾過) 製品一覧'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {treatmentList.map(d => (
                      <div key={d.id} onClick={() => setSelectedSeries(d)} className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition group">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">{d.maker}</div>
                            <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600">{d.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className={`text-[10px] px-2 py-1 rounded text-white ${d.type === 'hemodiafilter' ? 'bg-teal-500' : 'bg-blue-500'}`}>{d.type === 'hemodiafilter' ? 'HDF' : 'HD'}</span>
                              {d.hdfClass && <span className="text-[10px] bg-teal-700 text-white px-2 py-1 rounded">{d.hdfClass}</span>}
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded">{d.material}</span>
                            </div>
                          </div>
                          <ChevronRight className="text-gray-300 group-hover:text-blue-500"/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             )}
           </div>
        )}


        {/* DIALYZER DETAIL */}
        {selectedSeries && <DialyzerDetail series={selectedSeries} />}

        {/* COLUMN LIST */}
        {view === 'column_list' && !selectedDevice && (
          <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-indigo-900 flex items-center">
                <Layers className="w-8 h-8 mr-2" />
                β2-MG 吸着カラム
              </h2>
              <button 
                onClick={() => setShowReimbursement(true)}
                className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow transition"
              >
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                診療報酬・算定要件
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredColumnList.map(device => (
                <button 
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  className="bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-xl transition-all text-left flex flex-col h-full group"
                >
                  <div className="mb-4 flex justify-between items-start">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase">{device.category}</span>
                    <span className="text-[10px] text-gray-400 border px-1 rounded">{device.maker}</span>
                  </div>
                  <h3 className="font-bold text-xl text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">{device.name}</h3>
                  <div className="flex-grow">
                    <ul className="text-xs text-gray-500 list-disc ml-4 space-y-1">
                      {device.indication.slice(0, 3).map((ind, i) => <li key={i}>{ind}</li>)}
                    </ul>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-indigo-500 font-bold text-sm">
                    マニュアルを確認 <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* APHERESIS MENU (Category Selection) */}
        {view === 'apheresis_menu' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-rose-800 mb-6 flex items-center">
              <ShieldAlert className="w-8 h-8 mr-2" />
              アフェレシス療法選択
            </h2>
            
            {/* Disease Search Button */}
            <button 
              onClick={() => setView('apheresis_disease')}
              className="w-full bg-rose-600 text-white p-4 rounded-xl shadow-lg mb-8 flex items-center justify-center font-bold text-lg hover:bg-rose-700 transition"
            >
              <Stethoscope className="w-6 h-6 mr-3" />
              適応疾患からデバイスを検索する
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { type: 'CRRT', label: 'CRRT (持続緩徐式血液濾過)', desc: 'AKI, 敗血症, 重症膵炎など' },
                { type: 'PE', label: 'PE (単純血漿交換)', desc: '劇症肝炎, 術後肝不全, TTPなど' },
                { type: 'DFPP', label: 'DFPP (二重濾過血漿交換)', desc: 'ABO不適合, MG, SLEなど' },
                { type: 'PA', label: 'PA (血漿吸着)', desc: '免疫吸着, ビリルビン吸着' },
                { type: 'DHP', label: 'DHP (血液吸着)', desc: '薬物中毒, 肝性昏睡, UC, 敗血症' },
                { type: 'CART', label: 'CART (腹水濾過濃縮)', desc: '難治性腹水・胸水' }
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleApheSelect(item.type as ApheresisType)}
                  className="bg-white p-6 rounded-2xl border-2 border-rose-100 hover:border-rose-500 hover:shadow-xl transition-all text-left group"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl font-bold text-gray-800 group-hover:text-rose-700">{item.type}</span>
                    <ChevronRight className="text-gray-300 group-hover:text-rose-500" />
                  </div>
                  <div className="font-bold text-sm text-gray-700 mb-1">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* APHERESIS LIST & REIMBURSEMENT BUTTON */}
        {view === 'apheresis_list' && selectedApheType && !selectedDevice && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-rose-800 flex items-center">
                <span className="bg-rose-100 text-rose-800 px-3 py-1 rounded text-lg mr-3">{selectedApheType}</span>
                デバイス一覧
              </h2>
              {/* Reimbursement Button */}
              {(selectedApheType === 'CRRT' || selectedApheType === 'PE' || selectedApheType === 'DFPP' || selectedApheType === 'PA' || selectedApheType === 'DHP' || selectedApheType === 'CART') && (
                <button 
                  onClick={() => setShowReimbursement(true)}
                  className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow transition"
                >
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                  診療報酬・算定要件
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApheList.map(device => (
                <button 
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  className="bg-white p-6 rounded-xl border border-gray-200 hover:border-rose-400 hover:shadow-xl transition-all text-left flex flex-col h-full group"
                >
                  <div className="mb-4 flex justify-between items-start">
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded uppercase">{device.type}</span>
                    <span className="text-[10px] text-gray-400 border px-1 rounded">{device.maker}</span>
                  </div>
                  <h3 className="font-bold text-xl text-gray-800 mb-2 group-hover:text-rose-600 transition-colors">{device.name}</h3>
                  <div className="flex-grow">
                    <ul className="text-xs text-gray-500 list-disc ml-4 space-y-1">
                      {device.indication.slice(0, 3).map((ind, i) => <li key={i}>{ind}</li>)}
                    </ul>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-rose-500 font-bold text-sm">
                    マニュアルを確認 <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* APHERESIS DISEASE SEARCH VIEW */}
        {view === 'apheresis_disease' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-rose-800 mb-6 flex items-center">
              <Stethoscope className="w-8 h-8 mr-2" />
              適応疾患から検索
            </h2>
            
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
              <h3 className="text-sm font-bold text-gray-500 mb-3">疾患を選択してください</h3>
              <div className="flex flex-wrap gap-2">
                {allDiseases.map(disease => (
                  <button
                    key={disease}
                    onClick={() => setApheDiseaseFilter(disease === apheDiseaseFilter ? '' : disease)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                      apheDiseaseFilter === disease 
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {disease}
                  </button>
                ))}
              </div>
            </div>

            {apheDiseaseFilter && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {filteredDiseaseDevices.map(device => (
                  <button 
                    key={device.id}
                    onClick={() => setSelectedDevice(device)}
                    className="bg-white p-6 rounded-xl border border-gray-200 hover:border-rose-400 hover:shadow-xl transition-all text-left flex flex-col h-full group"
                  >
                    <div className="mb-4 flex justify-between items-start">
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded uppercase">{device.category}</span>
                      <span className="text-[10px] text-gray-400 border px-1 rounded">{device.maker}</span>
                    </div>
                    <h3 className="font-bold text-xl text-gray-800 mb-2 group-hover:text-rose-600 transition-colors">{device.name}</h3>
                    <div className="flex-grow">
                      <ul className="text-xs text-gray-500 list-disc ml-4 space-y-1">
                        {device.indication.map((ind, i) => (
                          <li key={i} className={ind.includes(apheDiseaseFilter) ? 'font-bold text-rose-700 bg-rose-50' : ''}>
                            {ind}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-rose-500 font-bold text-sm">
                      マニュアルを確認 <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* APHERESIS MODAL (Device Detail) */}
        {selectedDevice && (
          <ApheresisModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
        )}

        {/* REIMBURSEMENT MODAL */}
        {showReimbursement && selectedApheType && (
          <ReimbursementModal type={selectedApheType} onClose={() => setShowReimbursement(false)} />
        )}

      </main>
    </div>
  );
}