export interface PromptChip {
  label: string;
  fragment: string;
}

export const PROMPT_CHIPS: PromptChip[] = [
  { label: 'Change background', fragment: 'Change the background to ' },
  { label: 'Remove text', fragment: 'Remove all text and lettering. ' },
  { label: 'Add text', fragment: 'Add the text "" in a stylish font. ' },
  { label: 'Change lighting', fragment: 'Change the lighting to ' },
  { label: 'Shift mood', fragment: 'Shift the overall mood to ' },
  { label: 'Alter color palette', fragment: 'Alter the color palette to ' },
  { label: 'Change perspective', fragment: 'Change the camera perspective to ' },
  { label: 'Add object', fragment: 'Add a ' },
  { label: 'Remove object', fragment: 'Remove the ' },
  { label: 'Change style', fragment: 'Change the visual style to ' },
  { label: 'More detail', fragment: 'Add more fine detail and texture. ' },
  { label: 'Simplify', fragment: 'Simplify the composition, keep it minimal. ' },
];
