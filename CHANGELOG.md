# CHANGELOG

## Unreleased

- Archetype added - for characters only - https://github.com/cragstone/Pendragon/wiki/Archetype
- Holds base stats and starting values for skills
- Can add via drag/drop and character creation
- Char stats in Constructed mode limited by min/max from Archetype
- Culture has stats and max removed, leaving bonus and skills
- Characters and Followers now have their stats reduced where age is <13
- Followers have a died entry to record year of death
- Dialog box now use Light/Dark mode and follow the general colour theme
- All items now use Light/Dark mode and follow the general colour theme

## 14.20

- "Event (History)" can't be created as an item from the Item Directory - you only do this from the character sheet
- Minor CSS tweaks

## 14.19

- Localized Skill Categories pills on CharV2 skill tab
- Fixed an issue with Starting Skill scores not calculating when dropping an skill on a character sheet.
- Character ages will automatically update when game year is changed via GM menu
- Fixed issue with Battles and Encounters not opening (Mr Primate)
- Follower autocalc of derived stats fixed

## 14.18

- Additional Combat Actions Implemented disarm, evade, zigzag, dodge, set spear (ryak2)

## 14.17

- Battles and Encounters use PIDs again when adding encounters and npcs respectively.
- They will try to find the best match with highest priority where the PID is matched, otherwise they will use the UUID of the original drop
- This allows for GMs to create their own versions of encounters etc that may differ from the books and use them in preference by giving them a higher priority
  without having to change the battles etc
- When dropping encounters and npcs on to Battles and Encounters respectively you will get a dialog box where you can change the name of the item
  without changing the underlying actor
- Corrected the PID for starting religion table and some issues where the underlying documents from roll tables are in compendiums on character creation.
- Fixed a bug with weapons throwing an error

## 14.16

- Functionality for the Nobles Handbook is being implemented in stages. A premium module will hopefully be out in due course with all the content already created for you.
- But for now Manors, Baronies, Background Characters and Estate Improvements have been added to the game.
- Manors and Baronies are Actors but you can drop them on to a character sheet https://github.com/cragstone/Pendragon/wiki/Manor https://github.com/cragstone/Pendragon/wiki/Barony
- Background Characters are actually Items - they are the court/retinue for Manors and Baronies - https://github.com/cragstone/Pendragon/wiki/Background-Character
- Estate Improvements are Items used to improve a Manor or Barony
- The sheets are trying to follow the colour and feel of the V2 Character Sheet but there are a few style differences. Your feedback would be appreciated on look, feel, content etc.
- Migration of Game Instructions to the Github wiki has started. This should make it easier/quicker to update game instructions - https://github.com/cragstone/Pendragon/wiki
- You will start to see an orange icon with a question mark on some part of Actor/Item sheets - clicking on it will open a browser window taking you to the relevant wiki page
- There is a game setting (under Display Options) so users can turn this help icon off so it won't be displayed
- NPCs have a new "Player Notes" section. If you give Limited ownership of NPCs to players they will see the name, icons and player notes only (read only). Owners and Observers see everything except GM Notes
- NPC Notes have been renamed NPC GM Notes
- Thank you to Tontione for updating the French language translations
- Fixed an issue with ideals where the relevant skill, trait etc isn't on the character sheet
- GM Tabs on Items hidden once again from players

## 14.15

- The Feast Deck automation enhancements are all the hard work of Ryak2
- Updated English and French translations and tooltips for the feast tracker and other related strings (ryak2)
- Added support for drawing Feast Deck event cards (GMH pp. 41-42): players draw cards up to their Total APP limit (GMH Tables 3.4/3.5), posting card faces to chat, with Play/Draw Again buttons and Host cards ending the Round. This requires a valid Feast Deck (see next point) otherwise the deck controls are hidden without it (ryak2)
- Added Game setting where GM can enter the UUID of their custom Feast Deck. If this is left blank or the UUID is invalid the game will look for the Feast Deck from the GM Handbook premium module.
- Ending a feast now opens an end-of-feast Feasting Glory award dialog (GMH p. 44), prefilled from APP, Event Geniality and rounds attended, with bonus Glory for the most notable attendee (ryak2)
- Added a feast size setting (Small/Medium/Large/Royal) to the feast tracker, suggesting minimum rounds per GMH Table 3.2 and driving the end-of-feast geniality threshold and bonus Glory per GMH Table 3.7 (ryak2)
- Feast combatants now start with Geniality derived from their Standard of Living clothing (GMH Table 3.1) instead of a fixed value. Geniality gains are capped at the character's APP (ryak2)

## 14.14

- Fixed an issue where character creation was incorrectly flagging certain steps as completed

## 14.13

- Character Sheet V2 has arrived, and it has Dark Mode. This is all down to Johnny B who has delivered an absolute blinder.
- There are some basic instructions and info available on the wiki - https://github.com/cragstone/Pendragon/wiki/Character-Sheet-Version-2
- To toggle between the V1 and V2 sheets please use the button at the top right of the character sheet.
- There is some functionality on V1 that isn't available on V2 but also additional functionality on V2.
- Once we have migrated the V1 functionality across entirely we will remove the V1 sheet (no timeframe on this).
- Please feel free to give us feedback on the V2 sheet to help develop it - https://github.com/cragstone/Pendragon/issues
- We will use the V2 scheme (colours, fonts etc) for new Actor and Item types and will look to migrate the existing sheets across to V2
- Despite what I may have said previously - the manual Glory and track Wound options are embedded within V2.
- Again, a huge thanks to Johnny for all his hard work and a shout out to Mr Primate who has helped review and and make edits.

## 14.12

- Character Creation dialog box text etc now visible in Dark Mode.

## 14.11

- Skill Selection Score dialog window is now resizeable and scrollable
- Added a tooltip on Character Creation if the character is not ready to be knighted saying which tests are passed/failed

## 14.10

- Fixed some rolls not working where items don't have a PID (Mr Primate)
- French language pack updated (Tontione)
- Default character art updated with version for dark mode. This will be used as default going forward
- Included a macro that checks for Game World Actors and Items without PIDs and offers the chance to automatically create them

## 14.9

- Parents Glory corrected to 2D6 & 3D6 (not 2D6 for both)
- Ideal damage changed to a string (to allow for Wodinic Knight damage bonus of +1D6)

## 14.8

- Added some PIDs as registered keys (mostly tables, but also Horsemanship)
- Fixed pidflag error for Mounted and Charge combat attacks (testing for i.skill.horsemanship/i.skill.charge)
- Misc journal css updates
- Modified roll tables now work properly where the minimum result value is zero
- Cost of horses on the description tab have been fixed
- Stats tab on character sheet tweaked to add back "age" values in
- New default icon for Characters and NPCs with a better Pendragon flavour (thanks to Ossi for the art)
- Horsemanship skill score is shown on the Combat tab as an aide memoire, under the healing section. You can roll the skill from here
- There is a new "Manual Glory" game setting (default is off). When activated a "Manual Glory" adjustment line is available at the top of the History tab allowing you to adjust Glory.
- There is a new GM tool which allows the GM to issue Glory Awards to characters (you get to enter the title and then the value for each character). History events are created for non-zero awards
- Another new game setting under "Dice". Dice Delay, when activated, will not update the Chat Card for Opposed/Combat rolls until the Dice So Nice animations have finished.
- Fixed an issue where a random dice roll happened on the first opposed roll being added to a chat card
- Armour notes and disadvantages are now displayed on the character sheet gear tab
- Tooltip on the horse MOV on the Squires tab shows the various move rates for the horse
- Default journals now work in dark mode.
- Macro added in Systems Macro to add "Pendragon" css flags so you can make your journals look like the books. Copy and paste the journal UUID in to the dialog box

## 14.7

- French language pack updated to more align with the official French translation of Pendtagon (Tontione)
- Adding rolls to an existing open Oppoosed/Combat card should now add it to the newest open card (not the oldest) (MrPrimate)
- Oppossed/Combat cards older than 24 hours will be closed automatically (Mr Primate)
- New worlds should once again have the correct background image appearing
- The system battle scene should now have the correct background image
- Adding tokens to a scene via the Encounter card should now add dynamic rings/relevant artwork
- CCI Instructions now refer to Pendragon, not Rivers of London

## 14.6

- Fix for bug stopping skill rolls etc working. Sorry about that

## 14.5

- async removed from actor.mjs preparation to prevent race conditions(James B)
- Compendia packs now held as YAML files (Mr Primate & Johnny B)
- Feast tracker fixed (JohnnyB)
- Wound names now set by amount of damage. Wound description can be edited on wound sheet. Character wound table shows description if populated, otherwise name (Mr Primate)
- Horsemanship skill now counts towards Knightly test as a non-combat skill
- Standard of living now shows on the character sheet (it is set in Winter Phase)
- Fields that can be edited on the character sheet now show a red line at the bottom or, where they are in a grid, have a grey background to make it clearer what can be edited
- EXPERIMENTAL FEATURE = Game setting added in Combat Settings that turns off wounds - in this case you just edit the HP. Adding damage will not check for Minor, Major or Mortal wounds, but Natural Healing will increase HP.
  It is not used in the forthcoming v2 Character Sheet yet
- A lot of double clicks have been removed in favour of single clicks. Generally only destructive actions will be double clicks.
- Game Year setting replaced using Foundry native Calendar and new worlds will default to 510.
- There are two new buttons in the GM Tools - to increase and decrease the Game Year by one. You can always enter await game.time.set({year:510}) in the console (F12) to change the year
- Removed an infinite loop on Party/Battle update(Mr Primate)
- Fixed some unreadable dialogues in Dark Mode (Mr Primate)
- Corrected trait typo (Mr Primate)

## 14.4

- Base Skill Score multipliers are no longer integers.

## 14.3

- Decision Rolls should now display the target score correctly in the Chat Card

## 14.2

- System instructions now visible in Dark Mode

## 14.1

- Moved to Foundry V14 and Data Models (thanks to JohnnyB)
- CCI updated for V14 (thanks to James B)
- PLEASE BACK UP YOUR WORLDS BEFORE MIGRATING

## 13.64

- Fixed bug on creating Ideals

## 13.63

- Fixed Character Create tab layout

## 13.62

- Character Creation has been revamped. Turning Character Creation mode on adds an extra "Create" tab to the character sheet.
- The steps are listed and each can be activated/reset independently (except Creation Mode - see the note)
- Character creation notes have been updated
- Skill Category labels now visible in Dark Mode
- Closing/cancelling a roll dialog window stops the roll from proceeding
- Some additional character info added to Bio tab - year died, home, gender, parent's class
- Age no longer advances after "Died" year added.
- Class now has a "Starter Class" checkbox - Starter Classes are used to determine Class before Knighthood in character creation.
- Non-starter classes can be selected after Knighthood
- Hopefully the PID button is behaving on roll tables and stops disappearing
- The rest of the system has (and I hope I've caught them all) migrated to V2 Application.
- On Roll Tables Summary tab there is a new tickbox to allow for a Modifier. See the System Instructions for more info.

## 13.1.61

- Small update to game instructions for Character Creation

## 13.1.60

- New characters will by default be unlocked when created so you should see the Skills, Passions and Traits if you have either the Core Module, Base Module or have created your own skills etc.
- Combat Tracker for Feasts now show Glory and Geniality once again

## 13.1.59

- Knockdown stat is back on the character sheet
- Follower sheets now have the portrait in the correct place allowing you access to stats again

## 13.1.58

- Migration script added for Classes/Ideals in world

## 13.1.57

- Updated "Honor" passion pidflag to i.passion.honor, with migration script to replace i.paasion.honour with i.passion.honor

## 13.1.56

- NPCs making Mounted or Charge skills without a Horsemanship or Charge skill will use their base weapon attack rather than zero
- Combat Roll chat message combatant name/action don't wrap over on to the weapon name
- Fixed an issue (hopefully) with NPCs skill and passion names not showing when sheet unlocked
- Clicking on a scene link in a journal now opens the scene for the GM rather than the scene config page. It doesn't activate the scene, just takes the GM there to view it.

## 13.1.55

- Skills required in Family Characteristics step of character creation are now added to the character sheet if they are missing.

## 13.1.54

- Tweaks to Journal CSS
- Changes to how NPC Knockdown is handled/displayed

## 13.1.53

- GMs only, will get the option when adding a class to a character with an existing class to allow this to happen
- The old class is deleted but equipment, passions etc do not change
- The new class is added along with associated equipment, but no passions are added/adjusted
- The aim is to allow squire characters to be "promoted" to Knight with minimal manual work

## 13.1.52

- Another CSS change so item notes in a locked compendium in dark mode are readable.

## 13.1.51

- Fixed some CSS on NPCs and Items so header menus and tab names are visible in Light/Dark mode

## 13.1.50

- Can now access PIDs on Roll Tables
- Late Boy King Period added (515-518) so Boy King Period now runs (510-514)
- Ideals now have a toggle for Magical Protection

## 13.1.49

- Item and NPC sheets window header text now legible in Dark Mode.

## 13.1.48

- File rename to fix a bug on Linux systems.

## 13.1.47

- NPCs have moved to V2 Application.
- NPCs, when locked, have up/down chevron icons so you can show/hide the skill, weapon, armour etc lists.
- NPCs notes have been moved to a separate panel which can be toggled on/off (scroll icon)
- NPCs now have base stats and skills/passions/traits which can have a rollable starting value (toggle the user icon to show this screen)
- NPCs now have a Glory Total score - which can be used to make Glory Rolls. This is separate to Glory Award (the value of Glory earned for defeating the NPC)
- There's a game setting so you can determine whether these NPC rollable starting values are used
- Skill now have a "Magical Talent" checkbox - they act like skills in all other respects
- Magical Talent skills now appear in their own section on NPC sheets. They will appear on the skills section for Characters (not expecting characters to have them)
- When editing Passion or Skill names on the NPC sheet the Main Name will be shown when unlocked, unless it is a speciailised skill/passion in which case the specialism is shown. A tool tip shows
  the full name, and when the sheet is locked the full name is shown.
- Character Sheet now has a "Field Position" on the combat tab just after Battle Posture - this is reflected on the Battle Sheet
- Morale Loss can be rolled from the Encounter Card - it does not automatically update the Battle

## 13.1.46

- This version of the Pendragon System has moved to version 13 only.
- Bug fixes for V12 will be continued but the new functionality will not be added to V12 versions
- Ransom and Knight Values added to NPC
- Encounter Cards added as an actor type for Battles. You can add up to four NPCs to an encounter
- Battle Cards added (you drop Encounter cards on to battles along with characters). Game system instructions have been updated for these
- If you want (in line with the rules) to only add Glory during the Winterpahse you can now record Glory in the "Earned in Year" section
  of passive glory on the "Events" tab. It will be added as part of the passive Glory score during WinterPhase.

## 13.1.45

- test version only

## 13.1.44

- Fixed Lance where Additional Damage is blank
- If a roll formula is blank it will now default to "0"
- When making a combat roll or a damage roll the dialog box gives you an option to enter a damage modifier which will be applied when/if damage is rolled

## 13.1.43

- Add Can See Tile permission to CCI: Open Document (James B)
- Reduce minimum allowed Document permission to limited in CCI: Open Document (JamesB)
- Added a widget to show Game Year and corresponding Period at the top of the scene (JohnnyB)
- Two handed Lances now get the +2D6 bonus from "additional damage"
- Charactersand NPCs can add an image of their Coat of Arms on the top part of the sheet to the left of the stats.
- The image to the right is for the character/npc portrait.
- There is a new actor type "Party". The GM can add and remove characters (not other actor types or items).
- Players can open their character sheets from the party
- By default players have observer status and both GM and players see a health bar for each character along with traits, passions and skill with a score of 16+
- There is a Game Setting that allows HP values and highscores to be visible to all players (turn it off and only GM can see the them, but players see the HP bar)
- You can once again delete wounds using the broom icon.

## 13.1.42

- Additional CCI option, Ambient Light toggle added
- All CCI show/hide options have become show/hide/toggle

## 13.1.41

- Chaosium Canvas Interface update with more options

## 13.1.40

- New CCI: Drawing Toggle option added, again thanks to James.

## 13.1.39

- CCI has now been added for Version 12 users, massive thanks to james for this.

## 13.1.38

- Dropping non-specialised skills on to an actor no longer asks you to add a speciality
- You can now drag Journals and Macros to the hotbar.
- Game instructions tweaked to highlight you change a characters age by altering their year of birth
- Chaosium Canvas Interface (CCI) added for Foundry Version 13 users - code is courtesy of James B - user guide at https://github.com/Genii-Locorum/aov/wiki/Chaosium-Canvas-Interface-%E2%80%90CCI
- Loading art has changed and if you create a new world a default scene is created and activated

## 13.1.37

- In my enthusiasm I added some changes which broke the system for V12 on Foundry. I have backed the changes out
- This doesn't impact any game functionality
- My apologies, Dangermouse.

- Duplicating a character no longer adds skills, passions and traits a second time
- Increased the default height of some items so that they show all the contents

## 13.1.36

- Fixed an issue with classes and passions not showing properly when added
- You can now add multiple pieces of equipment with the same name to a class
- Skills now have a series of toggle boxes for skill categories, replacing the Combat and Non-Knightly tick-boxes. Data will be migrated automatically.
- Skills also have a "Starter Skill" tickbox - if ticked the skill will be added to new actors (this will be based off the skill with the highest priority in its PID)
- Skills and Passions now have a "Specialised" toggle. When activated you enter the item in two parts - the first is the main name (e.g. Hate) and the second is the specialism (e.g. Saxons)
- If the Skill or Passion is specialised but doesn't have a specialism (or has the default of 'specify') then you will be asked to name it when dropping it on the character sheet
- Religions (the item) can now have a religion skill added (PID must start with i.skill.religion for example i.skill.religion-pagan)
- When adding a religion to the Character the relevant skill will be added if it doesn't already exist on the character. This also occurs during character creation
- PID code updated so that best PID is now selected purely on priority irrespective of whether this is a game world or compendium document
- With the exception of equipment, weapons and armour an item needs to have a PID to be added to a character sheet (to prevent other errors occurring)

## 13.1.35

- Fixed an issue with Family Characterstic rolls in character creation not displaying results properly

## 13.1.34

- Update character creation for Foundry V13 roll tables

## 13.1.33

- Reworked winter skill training dialog
- Clarified wording around winter characteristic training
- Fix missing PID editor on rollable tables
- French translation provided by Kyllianm85

## 13.1.32

- Fixed issue with GM Tools menu causing tokens not to drag properly on the canvas

## 13.1.31

- Remember if an encounter is a skirmish or a feast
- Show the initiative roll for feast seating in the chat
- Allow GM to move feast participant seating via context menu
- Track geniality via the combat tracker during a feast

## 13.1.30

- Complete migration of item sheets to V2 Application
- Ensure all V2 item sheets can be resized like their V1 counterparts
- Bump verified compatibility version to 13.345
- Rebuilds the instructions compendium, fixing all the broken links and ordering of journals
- Empty droppable areas on item sheets now have an instruction and slightly larger drop target
- To align with the core rules, the default grid size is now 1 yard. As always, you can adjust this in the scene settings

## 13.1.29

- Adjusting selectivity of Dark Mode override (we are effectively ignoring Dark Mode and trying not to affect things that aren't part of the Pendragon system)
- Adjusted svg files to have an explicit height and width

## 13.1.28

- Updated to work with Foundry V13
- Anyone being able to expand a dice roll is a known issue
- Please report any other issues at https://github.com/Genii-Locorum/Pendragon/issues
- And PLEASE do back up your worlds before migrating to Foundry V13 and/or Pendragon 13.1.28

## 12.1.27

- History, Traits, Passions and Weapons have now been moved over to V2 Application
- Combat Tracker now has two types of Combat - Feast and Skirmish - with a button to switch between the two modes
- In feast mode, group the participants by seating area; sort by and display Glory instead of the raw initiative score.
- Uses DEX for initiative in skirmish mode (allowing for a functional combat tracker) and seating rolls for initiative in feast mode.
- Adds "enums" for the roll types, card types, and roll results, making it easier to avoid confusion in some places.

## 12.1.26

- You can once again add PIDs to armour

## 12.1.25

Some colour changes so that even if using Dark mode the text will still be black and therefore visible. If I've missed any instances then please let me know.
When dropping traits, passions, skills etc to other items (e.g. adding Traits to a Religion) you will get a message if the item doesn't have a PID and therefore can't be dropped

## 12.1.24

- Corrected a typo causing Critical Damage to not roll correctly. Thank you to Razage.
- The Armour sheet now has an "Available Year" input field on the Description tab, which then shows the period the item is available in. This is part of moving to Application V2 and will be
  extended to other items as we migrate them. Only GMs can alter the year. Thanks to jbowtie.

## 12.1.23

All of this is the hardwork of jbowtie - all thanks and credit to him

- When you select a religious trait or it's opposite as your famous trait during character creation, it now becomes 16, not 19.
- Use the new passion selection dialog during the character creation training phase (step 13). Passions may only be raised, not lowered, during this step. (As opposed to Winter, when they may also be lowered).
- You can turn off child mortality in the game settings - this will skip child survival rolls and causes any "tragedy" result during childbirth to be treated as "no conception".

## 12.1.22

All of this is the hardwork of jbowtie - all thanks and credit to him

- Update the history dialog to ApplicationV2.
- Remove the (currently broken) favour checkbox. You can rename the event if you need to track favour.
- Remove the misleading read-only "description" label on the attributes tab.
- On the character sheet, swap the "Year" and "Event" columns, to read more naturally.
- On the character sheet, fix the broken 'delete event' functionality when the sheet is unlocked, allowing mistaken and blank entries to be cleaned up.
- During character creation, do not delete events when resetting step 13. This fixes the deletion of the 'born' and 'squired' events.
- During the winter phase, name events more precisely (not just 'History').
- Add infrastructure to support migrations, and use it to rename events named "History" that have a non-empty description.

## 12.1.21

- Winter phase passion dialog updated: Specific instruction at the top of the page, Group existing passions by courts, Correctly allow raising and lowering of existing passions, Capped at twenty for winter training, uncapped for prestige training (thanks to jbowtie)
- Skills now display the Description and GM Description properly.

## 12.1.20

- Fix issue with Winterphase not resetting some of the rolls, thus prevented them from being repeated.

## 12.1.19

- First toe in the water moving to V2 Application. Armour Sheet is now on V2. Please report any odd behavious
- Directed passions can be easily gained during play, by adding a "+" button next to each court.
- Passions with a zero score are now hidden when the sheet is locked (they are shown when the sheet is unlocked).
- Now shows the opposing traits and religious marker when you choose to train a trait.
- Uses the characteristic names in the stat selection dialog (one of the first dialogs a new player will see).
- Shows the name of the family characteristic in corresponding selection dialog (not just the skill name).
  -Training and prestige dialogs now broken up into more granular choices - addresses Redo training and practice dialog #17
- All this hard work is by jbowtie, thank you so much.

## 12.1.18

- Changes thanks to 'jbowtie' - now added as an author
- Religious traits are now marked as such.
- Appearance renamed to Appeal as per Pendragon 6E.
- Fixed an error where many traits were incorrectly being set to 0 when using constructed method.
- Single dialog for picking famous trait, showing the trait pairs.
- Trait pairs are sorted by name, always showing the correct order.
- Cannot choose Cowardly as a famous trait (due to valorous needing to be 15).
- Now shows the famous trait pair during point allocation (however cannot allocate points to either side).
- Now marks religious traits during point allocation.
- Existing "TraitsSelectDialog" named to "ItemsSelectDialog", reflecting its more generic usage.

## 12.1.17

- Players can now edit their horses - not just limited to GMs
- You can now give owned horses a name, colour, breed, cost, age, features and personality
- There is a new actor type - Follower. This is very much like an NPC but with a few of the Character background items. They also have a sub-type - Squire, Family, Retainer.
- Squire sub-types have a Squire score, which can be rolled, along with their age (on the personal details tab)
  They are designed to be converted in the longer term to characters and offer more detail than the "items" on the character sheet. You can use whichever option you want.
- There's a new game setting - "Use Reputation" which if active adds a new tab to the character sheet "Follower"
- GMs can drag other actors to a character sheet (only a character sheet), creating a "relationship" between the two actors - if the "Use Reputation" game setting is active - these relationships appear on the Follower tab
- Players can edit the title of the relationship or delete it.
- By clicking on the person's name in the follower tab (not the relationship item) you can open the relevant actor sheet if you have the right permissions
- If the actor is a Follower with sub-type "squire" you can make Squire and Age rolls from the follower tab.

## 12.1.16

- Squire age roles changed to age-9 per 6th Ed Core Rulebook (changed from age-11 in Starter Set)

## 12.1.15

- Corrected a couple of typos on "Oppossed" or "Oppossing" - to a single s - - thank you to John Barstow
- Changed code on select item dialog and radio buttons - thank you to John Barstow

## 12.1.14

- Change to manifest URL to correct where it points

## 12.1.13

- NPC sheets, when locked, only show the headings for Skills, Weapons etc when there are relevant contents. Heading always shown when the skill sheet is unlocked

## 12.1.12

- Added two new Icons to NPC sheet - close sheet and calculate NPC scores
- Close Icon closes the NPC sheet (sometimes the Close icon in the title bar can get hidden when run from a compendium)
- NPC secondary scores (max HP, Move, Damage etc) are now input fields rather than auto calcs to allow maximum flexibility and for potential future imports
- The NPC Calc Scores icon will auto calculate these scores for you - you can still then override them. Note this will auto calc all scores
- Valorous Modifier now added to NPC sheet
- Alternative Movement is added to NPC sheet - you can edit the title and the value. The value is not auto calculated
- Equipment Names on the equipment tab are now truncated to one line like the description - but the full name and descriptions are available as tooltips
- Deleting items (Equip, Traits, Skills etc) is now a Double Click not a single click - to prevent accidents
- Changed various items grids so "View" icon is visible when character sheet is unlocked as well as the "Delete" icon
- Added "Add Armour" option to the armour grid
- Description boxes are now rich text editors and the text is no longer displayed as bold by default
- A GM Roll option has been added to the GM Tools and as a macro. This allows the GM to make rolls without an actor (character, NPC etc).
- "Notable" added to EN.json
- PID icon moved to the first of the icons on the top right of the relevant sheet.

## 12.1.11

- "Opposing Name" on trait item sheet shows the input area if it is blank to make it easier to know where to enter the value
- Famous traits now have there score shown in Bold Italics, Exalted Traits are in Purple Bold Italics
- Religious traits (where the religious modifier is not zero) are underlined
- Passions are now grouped by Court
- Increased size of the "hit points" space to allow for values up to 999
- Changed Character Background & NPC Notes to a rich text editor to allow for [[/roll]] and hyperlinks

## 12.1.10

- Game mechanics updated to Core Rulebook for 6th Edition - PLEASE NOTE THIS IS A MAJOR CHANGE AND MAY BREAK YOUR PRE-EXISTING WORLDS SO MAKE BACKUPS BEFORE MIGRATING
- Add Pendragon ID (PID) - a wholesale lift and shift of the Call of Cthulhu ID implementation
- Added Fixed Opposed Roll (resistance roll), Inquiry (GM Rolls) and Friendly Opposed Rolls
- Expanded Opposed Rolls to allow up to 5 participants (but removed dice colours)
- Added option to reduce Critical Bonuses in Opposed rolls
- Added "flavour" labels to traits and passions for Unsung/Famous/Exalted as a tooltip
- Added FumbleXP Setting that works with AutomateXP so you can exclude Fumble rolls from XP checks
- Added family members as items and on the Bio tab on character sheet
- Character Creation Routine Added in steps
