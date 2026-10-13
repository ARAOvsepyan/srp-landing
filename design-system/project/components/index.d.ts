import type * as React from 'react';
export type IconName = 'crown' | 'shield' | 'blocks' | 'chart' | 'tv' | 'cap' | 'trophy' | 'arrow' | 'check';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'gold' | 'ghost' | 'burgundy'; size?: 'md' | 'sm'; block?: boolean; href?: string; icon?: IconName }
export declare function Button(props: ButtonProps): React.ReactElement;
export interface IconProps { name: IconName; size?: number; title?: string; className?: string }
export declare function Icon(props: IconProps): React.ReactElement;
export interface SectionHeaderProps { eyebrow?: string; title: string; accent?: string; sub?: string; align?: 'left' | 'center'; className?: string }
export declare function SectionHeader(props: SectionHeaderProps): React.ReactElement;
export interface StatProps { value: string; label: string; note?: string; size?: 'xl' | 'sm'; className?: string }
export declare function Stat(props: StatProps): React.ReactElement;
export interface FeatureCardProps { icon?: IconName; title: string; featured?: boolean; children?: React.ReactNode; className?: string }
export declare function FeatureCard(props: FeatureCardProps): React.ReactElement;
export interface ClubMedalProps { src: string; alt?: string; size?: number; className?: string }
export declare function ClubMedal(props: ClubMedalProps): React.ReactElement;
export interface ClubCardProps { logo: string; city: string; name: string; address?: string; phone?: string; blurb?: string; className?: string }
export declare function ClubCard(props: ClubCardProps): React.ReactElement;
export interface StepProps { n: number | string; title: string; children?: React.ReactNode; className?: string }
export declare function Step(props: StepProps): React.ReactElement;
export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; hint?: string; options?: { value: string; label: string }[] }
export declare function Field(props: FieldProps): React.ReactElement;
export interface NetworkPin { lat: number; lon: number; label?: string }
export interface NetworkMapProps { mapSrc: string; pins: NetworkPin[]; ghosts?: { lat: number; lon: number }[]; hub?: { lat: number; lon: number }; lit?: number; label?: string; className?: string }
export declare function NetworkMap(props: NetworkMapProps): React.ReactElement;
declare global { interface Window { SRPF: { Button: typeof Button; Icon: typeof Icon; SectionHeader: typeof SectionHeader; Stat: typeof Stat; FeatureCard: typeof FeatureCard; ClubMedal: typeof ClubMedal; ClubCard: typeof ClubCard; Step: typeof Step; Field: typeof Field; NetworkMap: typeof NetworkMap } } }
