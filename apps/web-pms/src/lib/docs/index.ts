export type DocLink = {
  title: string;
  href: string;
};

export type DocSection = {
  title: string;
  href: string | null;
  items: DocLink[];
};

export type DocsIndex = {
  root: DocLink[];
  sections: DocSection[];
};
