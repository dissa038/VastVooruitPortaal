"use client";

import { useEffect, useRef, useState, createContext, useContext } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { RemoveScroll } from "react-remove-scroll";
import { createPortal } from "react-dom";

/**
 * ============================================================================
 * UNIVERSELE CLOSE LOGICA - ÉÉN FUNCTIE VOOR ALLES
 * ============================================================================
 * 
 * ARCHITECTUUR:
 * Alle modal closes gaan via één functie: handleClose()
 * Deze functie detecteert automatisch de context en kiest de juiste methode:
 * 
 * 1. SWIPE-TO-DISMISS (mobile/mouse drag):
 *    - Swipe handlers doen hun eigen CSS animatie
 *    - handleClose() detecteert isDragging en doet alleen state update
 *    - Geen dubbele animatie!
 * 
 * 2. MOBILE BUTTONS/KLIKKEN:
 *    - handleClose() gebruikt closeModal() voor smooth slide-down animatie
 *    - CSS transform animatie naar beneden
 * 
 * 3. DESKTOP:
 *    - handleClose() roept onCloseProp() aan
 *    - Framer Motion AnimatePresence zorgt voor smooth fade/scale animatie
 * 
 * GEBRUIK:
 * In plaats van: onClick={onClose}
 * Gebruik:      const handleClose = useModalClose(); onClick={handleClose}
 * 
 * VOORBEELD:
 * ```tsx
 * function MyModalContent() {
 *   const handleClose = useModalClose(); // Haalt universele close functie uit Context
 *   
 *   return (
 *     <Button onClick={handleClose}>Sluiten</Button> // Smooth op mobiel EN desktop!
 *   );
 * }
 * ```
 * 
 * WERKWIJZE:
 * 1. Modal component maakt handleClose() functie die context detecteert
 * 2. handleClose() wordt via Context doorgegeven aan alle children
 * 3. Modals gebruiken useModalClose() hook om deze functie te krijgen
 * 4. Wanneer handleClose() wordt aangeroepen:
 *    - Swipe bezig? → alleen state update (swipe doet animatie)
 *    - Mobiel? → smooth slide-down animatie
 *    - Desktop? → Framer Motion smooth fade/scale animatie
 * ============================================================================
 */

// Context die de smooth close functie beschikbaar maakt aan alle Modal children
const ModalCloseContext = createContext<(() => void) | null>(null);

/**
 * Hook om de smooth close functie te krijgen binnen een Modal component
 * 
 * ⚠️  BELANGRIJK: Deze hook MOET BINNEN een Modal child component worden aangeroepen!
 *     Als je hem aanroept in de parent component (waar je <Modal> rendert), 
 *     is de Context nog niet beschikbaar en krijg je een no-op functie terug.
 * 
 * ✅ CORRECT - useModalClose() in een child component BINNEN de Modal:
 * ```tsx
 * function MyModal({ isOpen, onClose }) {
 *   return (
 *     <Modal isOpen={isOpen} onClose={onClose}>
 *       <MyModalContent />  // useModalClose() HIER aanroepen
 *     </Modal>
 *   );
 * }
 * 
 * function MyModalContent() {
 *   const handleClose = useModalClose(); // ✅ Werkt! Context is beschikbaar
 *   return <Button onClick={handleClose}>Sluiten</Button>;
 * }
 * ```
 * 
 * ❌ FOUT - useModalClose() in de parent component BUITEN de Modal:
 * ```tsx
 * function MyModal({ isOpen, onClose }) {
 *   const handleClose = useModalClose(); // ❌ Werkt NIET! Context bestaat nog niet
 *   return (
 *     <Modal isOpen={isOpen} onClose={onClose}>
 *       <Button onClick={handleClose}>Sluiten</Button>
 *     </Modal>
 *   );
 * }
 * ```
 * 
 * 💡 TIP: Voor custom close buttons, maak een kleine helper component:
 * ```tsx
 * function ModalCloseButton() {
 *   const handleClose = useModalClose();
 *   return (
 *     <button onClick={handleClose}>
 *       <X className="h-5 w-5" />
 *     </button>
 *   );
 * }
 * 
 * // Gebruik in je modal:
 * <Modal isOpen={isOpen} onClose={onClose}>
 *   <ModalCloseButton />  // ✅ Smooth close op mobiel!
 *   ...
 * </Modal>
 * ```
 * 
 * @returns Een functie die smooth sluit op mobiel (slide-down animatie), direct sluit op desktop
 */
export const useModalClose = () => {
  const closeModal = useContext(ModalCloseContext);
  if (!closeModal) {
    // Fallback voor development - geeft een warning maar crasht niet
    if (process.env.NODE_ENV === 'development') {
      console.warn('useModalClose must be used within a Modal component. Falling back to no-op.');
    }
    return () => {};
  }
  return closeModal;
};

// Modal stack management
let modalStack: string[] = [];
let modalCounter = 0;

const addToModalStack = (id: string) => {
  modalStack.push(id);
};

const removeFromModalStack = (id: string) => {
  modalStack = modalStack.filter(stackId => stackId !== id);
};

const isTopModal = (id: string) => {
  return modalStack.length > 0 && modalStack[modalStack.length - 1] === id;
};

const getModalZIndex = (id: string) => {
  const index = modalStack.indexOf(id);
  if (index === -1) return 10000;
  return 10000 + (index * 10);
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode; // Optionele titel boven de modal content
  stickyHeader?: React.ReactNode; // Sticky header die vast blijft bij scrollen (gebruik met overflowHidden)
  disableSwipeSelectors?: string[]; // CSS selectors waarvoor swipe moet worden uitgeschakeld
  hideCloseButton?: boolean; // Optie om het standaard sluitkruisje te verbergen
  noPadding?: boolean; // Optie om de standaard padding te verwijderen
  disableBackdropClick?: boolean; // Optie om klikken buiten de modal te disablen
  // overflowHidden: Vervangt overflow-y-auto door overflow-hidden voor interne scrolling (bijv. command-palette)
  overflowHidden?: boolean;
}

/**
 * Universele Modal component met stack management, swipe support en overflow controle
 *
 * FEATURES:
 * - Modal stack management (meerdere modals tegelijk mogelijk)
 * - Automatische Z-index berekening gebaseerd op stack positie
 * - Swipe-to-dismiss op mobiel (vanaf 100px afstand)
 * - Smooth animaties met Framer Motion
 * - Portal rendering voor juiste DOM positie
 * - Body scroll lock tijdens modal display
 * - Keyboard support (ESC om te sluiten)
 * - Responsive design (verschillend gedrag mobile vs desktop)
 * - SMOOTH CLOSE ANIMATIE op mobiel via Context systeem
 *
 * TECHNISCHE DETAILS:
 * - Gebruikt React Portal voor rendering buiten component tree
 * - Stack management voorkomt Z-index conflicten bij meerdere modals
 * - Touch event handling voor swipe gestures met preventDefault logica
 * - CSS transforms voor smooth animaties
 * - RemoveScroll voor body scroll prevention
 * - Context API voor smooth close functie (zie bovenstaande documentatie)
 *
 * SMOOTH CLOSE SYSTEEM:
 * - Modal maakt handleClose() functie die automatisch smooth sluit op mobiel
 * - handleClose() wordt via ModalCloseContext doorgegeven aan alle children
 * - Modals moeten useModalClose() hook gebruiken in plaats van direct onClose prop
 * - Dit zorgt ervoor dat buttons/kruisjes altijd smooth sluiten op mobiel
 *
 * Props overzicht:
 * - isOpen: boolean - Modal tonen/verbergen
 * - onClose: () => void - Sluit functie (wordt intern gewrapped voor smooth animatie)
 * - children: React.ReactNode - Modal inhoud (kunnen useModalClose() gebruiken)
 * - className?: string - Extra CSS klassen voor de modal container
 * - disableSwipeSelectors?: string[] - CSS selectors waarvoor swipe wordt uitgeschakeld (bijv. ['input', 'textarea'])
 * - hideCloseButton?: boolean - Verberg het sluit kruisje (default: false)
 * - noPadding?: boolean - Verwijder standaard padding (default: false)
 * - disableBackdropClick?: boolean - Blokkeer sluiten door buiten klikken (default: false)
 * - overflowHidden?: boolean - Gebruik overflow-hidden i.p.v. overflow-y-auto voor interne scrolling (default: false)
 *
 * Voorbeelden:
 * <Modal isOpen={isOpen} onClose={onClose}>Basis modal</Modal>
 * <Modal isOpen={isOpen} onClose={onClose} noPadding overflowHidden>Zoekbalk zonder padding</Modal>
 * <Modal isOpen={isOpen} onClose={onClose} hideCloseButton disableBackdropClick>Verplichte modal</Modal>
 * 
 * BELANGRIJK VOOR MODAL CHILDREN:
 * Gebruik useModalClose() hook in plaats van direct onClose prop:
 * ```tsx
 * function MyModalContent() {
 *   const handleClose = useModalClose(); // ✅ Smooth op mobiel!
 *   return <Button onClick={handleClose}>Sluiten</Button>;
 * }
 * ```
 */
export function Modal({ isOpen, onClose: onCloseProp, children, className, title, stickyHeader, disableSwipeSelectors, hideCloseButton = false, noPadding = false, disableBackdropClick = false, overflowHidden = false }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const desktopContentRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const lastTouchY = useRef<number>(0); // Houd laatste touch Y positie bij voor incrementele beweging
  const lastMovementDirection = useRef<'up' | 'down' | null>(null); // Track laatste beweging richting voor snap-back
  const maxDraggedDown = useRef<number>(0); // Track maximale omlaag getrokken afstand voor snap-back logica
  const overlayRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const isClosing = useRef<boolean>(false);
  const mouseDownInsideModal = useRef<boolean>(false); // Track of mousedown binnen modal content was
  const startX = useRef<number>(0);
  const startYDesktop = useRef<number>(0);
  const hasMoved = useRef<boolean>(false); // Track of muis daadwerkelijk heeft bewogen (niet alleen klik)
  const draggedOverSelectable = useRef<boolean>(false); // Track of drag over selecteerbaar element is gegaan
  const recentTextSelection = useRef<boolean>(false); // Track of er recent tekst geselecteerd was (voor backdrop click check)

  // Unique modal ID for stack management
  const modalId = useRef<string>(`modal-${++modalCounter}`);

  // Use state instead of ref for mobile detection to trigger re-renders
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [zIndex, setZIndex] = useState<number>(10000);

  // Modal stack management
  useEffect(() => {
    if (isOpen) {
      addToModalStack(modalId.current);
      setZIndex(getModalZIndex(modalId.current));
    } else {
      removeFromModalStack(modalId.current);
    }

    return () => {
      if (isOpen) {
        removeFromModalStack(modalId.current);
      }
    };
  }, [isOpen]);

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
    };

    // Check immediately
    checkMobile();

    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Effect voor de opening animatie op mobiel
  useEffect(() => {
    if (!isMobile || !isOpen || isClosing.current) return;

    const modal = modalRef.current;
    const overlay = overlayRef.current;
    if (!modal || !overlay) return;

    // Reset closing state
    isClosing.current = false;

    requestAnimationFrame(() => {
      // Start positie
      modal.style.transform = "translateY(100%)";
      overlay.style.backgroundColor = "rgba(21, 21, 21, 0)";

      // Force reflow
      modal.getBoundingClientRect();

      // Animatie starten
      modal.style.transition = "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)";
      overlay.style.transition =
        "background-color 0.4s cubic-bezier(0.32, 0.72, 0, 1)";
      modal.style.transform = "translateY(0)";
      overlay.style.backgroundColor = "rgba(21, 21, 21, 0.8)";
    });
  }, [isOpen, isMobile]);

  /**
   * Smooth close animatie functie voor mobiel
   * 
   * Deze functie voert de slide-down animatie uit op mobiel:
   * 1. Zet modal transform naar beneden (buiten beeld)
  2. Fade overlay uit
   * 3. Wacht 200ms voor animatie
   * 4. Roept onCloseProp() aan om modal state te updaten
   * 
   * Wordt alleen gebruikt op mobiel wanneer smooth animatie nodig is.
   */
  const closeModal = () => {
    if (!isMobile || !modalRef.current || isClosing.current) return;

    const modal = modalRef.current;
    const overlay = overlayRef.current;

    isClosing.current = true;

    // Maak scrollen direct mogelijk
    document.body.style.overflow = "unset";
    document.body.style.touchAction = "unset";

    // Start smooth slide-down animatie
    modal.style.transition = "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)";
    modal.style.transform = `translateY(${window.innerHeight}px)`;

    if (overlay) {
      overlay.style.transition =
        "background-color 0.4s cubic-bezier(0.32, 0.72, 0, 1)";
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0)";
    }

    // Wacht tot de modal bijna uit beeld is voordat we onCloseProp aanroepen
    // Dit zorgt ervoor dat de animatie zichtbaar is voordat de modal verdwijnt
    setTimeout(() => {
      onCloseProp();
      isClosing.current = false;
    }, 200);
  };

  /**
   * Universele close functie - ÉÉN FUNCTIE VOOR ALLE MODAL CLOSES
   * 
   * DEZE FUNCTIE WORDT VIA CONTEXT DOORGEVEN AAN ALLE MODAL CHILDREN
   * 
   * Logica (in volgorde van check):
   * 1. Swipe bezig? (isDragging.current) 
   *    → Alleen state update (swipe handler doet al CSS animatie)
   * 2. Mobiel + modal open + niet al aan het sluiten?
   *    → Gebruik closeModal() voor smooth slide-down animatie
   * 3. Desktop?
   *    → Roept onCloseProp() aan - AnimatePresence zorgt voor smooth exit animatie
   * 
   * Deze functie wordt gebruikt door:
   * - useModalClose() hook (voor buttons/kruisjes in modals)
   * - handleBackdropClick (voor klikken buiten modal)
   * - handleTouchEnd / handleMouseUp (voor swipe-to-dismiss)
   * - ESC key handler
   * - Desktop close button
   * 
   * BELANGRIJK: 
   * - Modals moeten useModalClose() gebruiken in plaats van direct onClose prop
   * - Overal in de app gebruiken voor consistente close logica
   * - Swipe logica blijft precies zoals het is - alleen close call verandert
   */
  const handleClose = () => {
    // Als swipe bezig is, swipe handler doet al animatie - alleen state update
    if (isDragging.current) {
      onCloseProp();
      return;
    }

    // Mobiel: gebruik smooth slide-down animatie
    if (isMobile && isOpen && !isClosing.current) {
      closeModal();
    } else {
      // Desktop: AnimatePresence zorgt automatisch voor smooth exit animatie
      onCloseProp();
    }
  };

  const updateOverlayOpacity = (translateY: number): void => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const maxTranslate = window.innerHeight;
    const progress = 1 - translateY / maxTranslate;
    const opacity = Math.max(0, progress * 0.8);
    overlay.style.backgroundColor = `rgba(21, 21, 21, ${opacity})`;
  };

  // Helper functie: Check of er nog scrollbare content is die kan scrollen (omhoog of omlaag)
  const canAnyScrollableScrollDown = (contentElement: HTMLElement, target: Element): boolean => {
    // Check main content - kan naar beneden scrollen?
    if (contentElement.scrollTop < (contentElement.scrollHeight - contentElement.clientHeight - 1)) {
      return true;
    }
    
    // Check textarea als target - kan naar beneden scrollen?
    if (target.tagName === 'TEXTAREA') {
      const textarea = target as HTMLTextAreaElement;
      if (textarea.scrollTop < (textarea.scrollHeight - textarea.clientHeight - 1)) {
        return true;
      }
    }
    
    // Check nested scrollable parent - kan naar beneden scrollen?
    let current: HTMLElement | null = target as HTMLElement;
    while (current && current !== contentElement) {
      if (current.scrollHeight > current.clientHeight) {
        if (current.scrollTop < (current.scrollHeight - current.clientHeight - 1)) {
          return true;
        }
      }
      current = current.parentElement;
    }
    
    // Check ALLE scrollbare divs binnen content - kunnen naar beneden scrollen?
    const allDivs = contentElement.querySelectorAll('div');
    for (const div of allDivs) {
      const scrollableDiv = div as HTMLElement;
      if (scrollableDiv.scrollHeight > scrollableDiv.clientHeight) {
        // Check of deze div naar beneden kan scrollen
        if (scrollableDiv.scrollTop < (scrollableDiv.scrollHeight - scrollableDiv.clientHeight - 1)) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Mobile swipe functionality - ALTIJD actief op mobiel
  useEffect(() => {
    const modal = modalRef.current;
    const content = contentRef.current;
    // Zorg ervoor dat modal open is EN mobiel is EN refs bestaan
    if (!modal || !content || !isMobile || !isOpen) return;

    // Helper: Check of een element kan scrollen in een bepaalde richting
    const canElementScroll = (element: HTMLElement, direction: 'up' | 'down'): boolean => {
      if (element.scrollHeight <= element.clientHeight) return false; // Niet scrollbaar
      
      if (direction === 'up') {
        return element.scrollTop > 0;
      } else {
        return element.scrollTop < (element.scrollHeight - element.clientHeight - 1);
      }
    };

    // Helper: Check of er ELK scrollbaar element bovenaan is
    const areAllScrollablesAtTop = (target: Element): boolean => {
      // Check main content
      if (canElementScroll(content, 'up')) return false;
      
      // Check textarea als target
      if (target.tagName === 'TEXTAREA') {
        const textarea = target as HTMLTextAreaElement;
        if (canElementScroll(textarea, 'up')) return false;
      }
      
      // Check nested scrollable parent
      let current: HTMLElement | null = target as HTMLElement;
      while (current && current !== content) {
        if (current.scrollHeight > current.clientHeight) {
          if (canElementScroll(current, 'up')) return false;
        }
        current = current.parentElement;
      }
      
      // Check ALLE scrollbare divs binnen content
      const allDivs = content.querySelectorAll('div');
      for (const div of allDivs) {
        const scrollableDiv = div as HTMLElement;
        if (scrollableDiv.scrollHeight > scrollableDiv.clientHeight) {
          if (canElementScroll(scrollableDiv, 'up')) return false;
        }
      }
      
      return true;
    };


    const handleTouchStart = (e: TouchEvent): void => {
      const target = e.target as Element;

      // 🎯 HANDLEBAR: Als je op de handlebar swipet, ALTIJD swipe-down-to-dismiss toestaan!
      const isOnHandlebar = target.closest('.modal-handle');
      if (isOnHandlebar) {
        startY.current = e.touches[0].clientY;
        lastTouchY.current = e.touches[0].clientY;
        lastMovementDirection.current = null; // Reset beweging richting
        maxDraggedDown.current = 0; // Reset maximale omlaag afstand
        currentY.current = 0;
        isDragging.current = true;
        modal.style.transition = "none";
        return;
      }

      // Check of target een input/select/textarea is
      const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT';
      const isTextarea = target.tagName === 'TEXTAREA';
      
      // 🚨 Blokkeer modal dragging voor opgegeven selectors (bijv. signature canvas)
      if (disableSwipeSelectors) {
        for (const selector of disableSwipeSelectors) {
          if ((isInput || isTextarea || target.tagName === 'SELECT') && 
              (selector === 'input' || selector === 'select' || selector === 'textarea')) {
            continue;
          }
          if (target.matches(selector) || target.closest(selector)) {
            isDragging.current = false;
            return;
          }
        }
      }

      // Sla alleen start positie op - start NIET met dragging
      startY.current = e.touches[0].clientY;
      lastTouchY.current = e.touches[0].clientY;
      lastMovementDirection.current = null; // Reset beweging richting
      maxDraggedDown.current = 0; // Reset maximale omlaag afstand
      currentY.current = 0;
      isDragging.current = false;
      modal.style.transition = "none";
    };

    const handleTouchMove = (e: TouchEvent): void => {
      const deltaY = e.touches[0].clientY - startY.current;
      const target = e.target as Element;

      // 🎯 HANDLEBAR: Als je op de handlebar swipet, ALTIJD swipe-down-to-dismiss toestaan!
      const isOnHandlebar = target.closest('.modal-handle');
      if (isOnHandlebar) {
        if (!isDragging.current) {
          isDragging.current = true;
          lastTouchY.current = e.touches[0].clientY;
        }
        e.preventDefault(); // Altijd preventDefault tijdens handlebar dragging
        
        // 🔥 INCREMENTELE BEWEGING: Bereken beweging sinds laatste touch positie
        const movement = e.touches[0].clientY - lastTouchY.current;
        const newY = Math.max(0, currentY.current + movement);
        lastTouchY.current = e.touches[0].clientY;
        currentY.current = newY;
        modal.style.transform = `translateY(${newY}px)`;
        updateOverlayOpacity(newY);
        return;
      }

      // Als we al aan het draggen zijn, ga door met modal dragging
      // 🔥 BELANGRIJK: Zodra we beginnen met draggen, blijven we draggen tot touchEnd
      // We controleren NIET meer of alles bovenaan is - dit voorkomt verspringing bij omhoog bewegen
      if (isDragging.current) {
        // Altijd preventDefault tijdens dragging om scrollen te voorkomen
        e.preventDefault();
        
        // 🔥 INCREMENTELE BEWEGING: Bereken beweging sinds laatste touch positie
        // Dit voorkomt verspringing wanneer je omhoog beweegt na omlaag te hebben getrokken
        const currentTouchY = e.touches[0].clientY;
        const rawMovement = currentTouchY - lastTouchY.current;
        
        // Update beweging richting EERST (voor snap-back check)
        const wasMovingDown = lastMovementDirection.current === 'down';
        if (rawMovement > 0) {
          lastMovementDirection.current = 'down';
          // Update maximale omlaag getrokken afstand
          maxDraggedDown.current = Math.max(maxDraggedDown.current, currentY.current);
        } else if (rawMovement < 0) {
          lastMovementDirection.current = 'up';
        }
        
        // 🎯 SNAP-BACK LOGICA: Als je omlaag trekt en dan meer dan 10px omhoog beweegt, spring terug
        // Check: beweeg omhoog EN was omlaag aan het bewegen EN modal is omlaag getrokken
        if (rawMovement < 0 && wasMovingDown && maxDraggedDown.current > 0) {
          // Je beweegt omhoog na omlaag te hebben getrokken
          const upwardMovement = Math.abs(rawMovement);
          
          // Als je meer dan 10px omhoog beweegt vanaf je maximale omlaag positie, spring terug
          if (upwardMovement > 10) {
            const overlay = overlayRef.current;
            // Smooth snap-back naar open positie (0)
            modal.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";
            if (overlay) {
              overlay.style.transition = "background-color 0.3s cubic-bezier(0.32, 0.72, 0, 1)";
              overlay.style.backgroundColor = "rgba(21, 21, 21, 0.8)";
            }
            modal.style.transform = "translateY(0)";
            currentY.current = 0;
            lastTouchY.current = currentTouchY;
            lastMovementDirection.current = null;
            maxDraggedDown.current = 0; // Reset maximale omlaag afstand
            // Stop met draggen na snap-back
            setTimeout(() => {
              isDragging.current = false;
            }, 300);
            return;
          }
        }
        
        // 🎯 ELASTISCHE WEERSTAND: Geef meer weerstand aan het begin voor elastisch gevoel
        // Hoe verder je trekt, hoe minder weerstand (soepeler)
        const resistanceThreshold = 40; // Na 40px is de weerstand volledig weg (was 80)
        const minResistance = 0.6; // Minimale beweging factor (60% aan het begin, was 35%)
        const maxResistance = 1.0; // Maximale beweging factor (100% na threshold)
        
        // Bereken weerstand factor op basis van huidige positie
        // Begint bij minResistance (veel weerstand) en gaat naar maxResistance (geen weerstand)
        const resistanceFactor = Math.min(
          maxResistance,
          minResistance + ((currentY.current / resistanceThreshold) * (maxResistance - minResistance))
        );
        
        // Pas weerstand toe op beweging (alleen bij omlaag bewegen)
        const movement = rawMovement > 0 
          ? rawMovement * resistanceFactor  // Omlaag: pas weerstand toe
          : rawMovement; // Omhoog: geen weerstand (soepel terug)
        
        // Bereken nieuwe Y positie - kan niet onder 0 komen
        // 🔥 BELANGRIJK: Gebruik Math.max(0, ...) om te voorkomen dat modal boven 0 komt
        // Maar update ALTIJD lastTouchY, ook bij omhoog bewegen, zodat volgende beweging correct is
        const newY = Math.max(0, currentY.current + movement);
        
        // Update lastTouchY ALTIJD, ook als newY 0 is
        // Dit zorgt ervoor dat de modal je vinger blijft volgen, ook bij omhoog bewegen
        lastTouchY.current = currentTouchY;
        currentY.current = newY;
        modal.style.transform = `translateY(${newY}px)`;
        updateOverlayOpacity(newY);
        return;
      }

      // We zijn nog NIET aan het draggen
      // Alleen starten als: downward swipe EN groot genoeg EN alles is bovenaan
      if (deltaY > 20) { // Lagere threshold voor makkelijker beginnen met draggen
        // 🚨 Blokkeer modal dragging voor opgegeven selectors (bijv. signature canvas)
        if (disableSwipeSelectors) {
          for (const selector of disableSwipeSelectors) {
            if (target.matches(selector) || target.closest(selector)) {
              // Target is binnen een disabled selector - NIET starten met draggen
              return;
            }
          }
        }
        
        if (areAllScrollablesAtTop(target)) {
          // Alles is bovenaan → start modal dragging vanaf 0
          // 🔥 BELANGRIJK: Start altijd vanaf 0, niet vanaf deltaY!
          // Dit voorkomt verspringing wanneer je begint met draggen vanuit een scroll area
          // De modal begint op 0 en volgt je vinger vanaf dat punt soepel
          startY.current = e.touches[0].clientY;
          lastTouchY.current = e.touches[0].clientY;
          lastMovementDirection.current = null; // Reset beweging richting bij start
          maxDraggedDown.current = 0; // Reset maximale omlaag afstand
          isDragging.current = true;
          e.preventDefault();
          // Start altijd vanaf 0 - modal begint bovenaan zonder verspringing
          currentY.current = 0;
          modal.style.transform = "translateY(0)";
          updateOverlayOpacity(0);
        }
        // Als er nog scrollbare content is, doe niets - laat browser scrollen
      }
    };

    const handleTouchEnd = (): void => {
      if (!isDragging.current) return;
      // GEEN isTopModal check - swipe moet altijd werken!

      const modal = modalRef.current;
      const overlay = overlayRef.current;
      if (!modal || !overlay) return;

      modal.style.transition = "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)";
      overlay.style.transition =
        "background-color 0.4s cubic-bezier(0.32, 0.72, 0, 1)";

      if (currentY.current > 30) {
        // Swipe down genoeg → sluit modal met smooth animatie (30px threshold voor 2x makkelijker sluiten)
        modal.style.transform = `translateY(${window.innerHeight}px)`;
        overlay.style.backgroundColor = "rgba(21, 21, 21, 0)";
        // Gebruik handleClose() voor consistente close logica
        // isDragging blijft true zodat handleClose() weet dat swipe animatie al bezig is
        setTimeout(() => {
          handleClose();
          isDragging.current = false;
          startY.current = 0;
          lastTouchY.current = 0;
          lastMovementDirection.current = null;
          maxDraggedDown.current = 0;
        }, 200);
      } else {
        // Niet genoeg geswiped → reset naar boven
        modal.style.transform = "translateY(0)";
        overlay.style.backgroundColor = "rgba(21, 21, 21, 0.8)";
        isDragging.current = false;
        startY.current = 0;
        lastTouchY.current = 0;
        lastMovementDirection.current = null;
        maxDraggedDown.current = 0;
      }
    };

    // Mouse handlers
    const handleMouseDown = (e: MouseEvent): void => {
      // Only handle mouse events if this is the top modal
      if (!isTopModal(modalId.current)) return;

      const target = e.target as Element;
      const modal = modalRef.current;
      const desktopContent = desktopContentRef.current;
      
      // Check of mousedown BINNEN de modal content was (niet op backdrop)
      mouseDownInsideModal.current = false;
      
      if (isMobile) {
        // Mobile: check of target binnen modalRef (de modal container) zit
        if (modal) {
          mouseDownInsideModal.current = modal.contains(target);
        }
      } else {
        // Desktop: check of target binnen desktopContentRef (de modal content div) zit
        if (desktopContent) {
          mouseDownInsideModal.current = desktopContent.contains(target);
        }
      }

      // 🚨 Blokkeer modal dragging voor opgegeven selectors (bijv. signature canvas)
      if (disableSwipeSelectors) {
        for (const selector of disableSwipeSelectors) {
          if (target.matches(selector) || target.closest(selector)) {
            isDragging.current = false;
            return;
          }
        }
      }

      // Alleen swipe mogelijk maken als mousedown binnen modal was
      // Als mousedown buiten was, is het gewoon backdrop click (wordt afgehandeld door handleBackdropClick)
      if (mouseDownInsideModal.current) {
        startY.current = e.clientY;
        currentY.current = 0;
        isDragging.current = true;
        if (modal) {
          modal.style.transition = "none";
        }
      }
    };

    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging.current || !isTopModal(modalId.current)) return;

      const deltaY = e.clientY - startY.current;
      const target = e.target as Element;

      // 🚨 Blokkeer modal dragging voor opgegeven selectors (bijv. signature canvas)
      if (disableSwipeSelectors) {
        for (const selector of disableSwipeSelectors) {
          if (target.matches(selector) || target.closest(selector)) {
        isDragging.current = false;
        modal.style.transform = "translateY(0)";
        return;
      }
        }
      }

      // ALTIJD downward swipe toestaan om modal te sluiten
      if (deltaY > 0) {
        e.preventDefault();
        currentY.current = deltaY;
        modal.style.transform = `translateY(${deltaY}px)`;
        updateOverlayOpacity(deltaY);
      } else {
        // Upward swipe - reset naar boven maar blijf in dragging mode
        currentY.current = 0;
        modal.style.transform = "translateY(0)";
      }
    };

    const handleMouseUp = (e: MouseEvent): void => {
      if (!isDragging.current || !isTopModal(modalId.current)) return;

      const modal = modalRef.current;
      const overlay = overlayRef.current;
      const desktopContent = desktopContentRef.current;
      if (!modal || !overlay) return;

      // Check of mouseup BUITEN de modal content is
      const target = e.target as Element;
      let mouseUpOutsideModal = false;
      
      if (isMobile) {
        // Mobile: check of target buiten modalRef zit
        mouseUpOutsideModal = !modal.contains(target);
      } else {
        // Desktop: check of target buiten desktopContentRef zit
        mouseUpOutsideModal = desktopContent ? !desktopContent.contains(target) : true;
      }

      modal.style.transition = "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)";
      overlay.style.transition =
        "background-color 0.4s cubic-bezier(0.32, 0.72, 0, 1)";

      // Alleen sluiten als:
      // 1. Mousedown was BINNEN modal (mouseDownInsideModal.current)
      // 2. Mouseup is BUITEN modal (mouseUpOutsideModal)
      // 3. Er genoeg gedragged is (> 30px - 2x makkelijker sluiten)
      if (currentY.current > 30 && mouseDownInsideModal.current && mouseUpOutsideModal) {
        // Mouse drag down genoeg EN binnen → buiten → sluit modal met smooth animatie
        modal.style.transform = `translateY(${window.innerHeight}px)`;
        overlay.style.backgroundColor = "rgba(21, 21, 21, 0)";
        // Gebruik handleClose() voor consistente close logica
        // isDragging blijft true zodat handleClose() weet dat swipe animatie al bezig is
        setTimeout(() => {
          handleClose();
          isDragging.current = false;
          startY.current = 0;
          mouseDownInsideModal.current = false;
        }, 200);
      } else {
        // Niet genoeg gedragged OF niet binnen → buiten → reset naar boven
        modal.style.transform = "translateY(0)";
        overlay.style.backgroundColor = "rgba(21, 21, 21, 0.8)";
        isDragging.current = false;
        startY.current = 0;
        mouseDownInsideModal.current = false;
      }
    };

    // Event listeners
    modal.addEventListener("touchstart", handleTouchStart, { passive: true });
    modal.addEventListener("touchmove", handleTouchMove, { passive: false });
    modal.addEventListener("touchend", handleTouchEnd);

    // Mouse event listeners
    modal.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      modal.removeEventListener("touchstart", handleTouchStart);
      modal.removeEventListener("touchmove", handleTouchMove);
      modal.removeEventListener("touchend", handleTouchEnd);

      modal.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onCloseProp, isMobile, isOpen, modalId]); // Voeg isOpen toe zodat listeners opnieuw worden geregistreerd wanneer modal opent

  // Desktop mouse drag-to-dismiss functionality
  useEffect(() => {
    // Alleen voor desktop
    if (isMobile || !isOpen) return;

    const desktopContent = desktopContentRef.current;
    const overlay = overlayRef.current;
    if (!desktopContent || !overlay) return;

    // Helper: Check of er tekst geselecteerd is
    const hasTextSelection = (): boolean => {
      const selection = window.getSelection();
      return selection !== null && selection.toString().trim().length > 0;
    };

    // Helper: Check of target een selecteerbaar element is (input, textarea, etc.)
    const isSelectableElement = (target: Element): boolean => {
      const tagName = target.tagName.toLowerCase();
      const isInput = tagName === 'input' && (target as HTMLInputElement).type !== 'button' && (target as HTMLInputElement).type !== 'submit' && (target as HTMLInputElement).type !== 'reset';
      const isTextarea = tagName === 'textarea';
      const isContentEditable = (target as HTMLElement).contentEditable === 'true';
      return isInput || isTextarea || isContentEditable;
    };

    // Desktop mouse handlers
    const handleDesktopMouseDown = (e: MouseEvent): void => {
      // Only handle mouse events if this is the top modal
      if (!isTopModal(modalId.current)) return;

      const target = e.target as Element;
      
      // Check of mousedown BINNEN de modal content was
      mouseDownInsideModal.current = desktopContent.contains(target);

      // Als mousedown op selecteerbaar element was, niet tracken voor drag-to-dismiss
      if (isSelectableElement(target)) {
        isDragging.current = false;
        hasMoved.current = false;
        return;
      }

      // 🚨 Blokkeer modal dragging voor opgegeven selectors
      if (disableSwipeSelectors) {
        for (const selector of disableSwipeSelectors) {
          if (target.matches(selector) || target.closest(selector)) {
            isDragging.current = false;
            hasMoved.current = false;
            return;
          }
        }
      }

      // Alleen swipe mogelijk maken als mousedown binnen modal was
      if (mouseDownInsideModal.current) {
        startX.current = e.clientX;
        startYDesktop.current = e.clientY;
        startY.current = e.clientY;
        currentY.current = 0;
        isDragging.current = true;
        hasMoved.current = false; // Reset beweging tracking
        draggedOverSelectable.current = false; // Reset selecteerbaar element tracking
      }
    };

    const handleDesktopMouseMove = (e: MouseEvent): void => {
      if (!isDragging.current || !isTopModal(modalId.current)) return;

      const deltaX = Math.abs(e.clientX - startX.current);
      const deltaY = e.clientY - startYDesktop.current;
      const target = e.target as Element;

      // Check of muis daadwerkelijk heeft bewogen (minimaal 10px)
      if (deltaX > 10 || Math.abs(deltaY) > 10) {
        hasMoved.current = true;
      }

      // Check of we over een selecteerbaar element zijn gegaan tijdens drag
      if (isSelectableElement(target)) {
        draggedOverSelectable.current = true;
      }

      // 🚨 Blokkeer modal dragging voor opgegeven selectors
      if (disableSwipeSelectors) {
        for (const selector of disableSwipeSelectors) {
          if (target.matches(selector) || target.closest(selector)) {
            isDragging.current = false;
            hasMoved.current = false;
            draggedOverSelectable.current = false;
            return;
          }
        }
      }

      // Track alleen downward drag
      if (deltaY > 0) {
        currentY.current = deltaY;
      }
    };

    const handleDesktopMouseUp = (e: MouseEvent): void => {
      if (!isDragging.current || !isTopModal(modalId.current)) {
        // Reset als we niet aan het draggen waren
        hasMoved.current = false;
        return;
      }

      const target = e.target as Element;
      
      // Check of mouseup BUITEN de modal content is
      const mouseUpOutsideModal = !desktopContent.contains(target);

      // Check of er tekst geselecteerd is
      const textSelected = hasTextSelection();
      
      // Track recent text selection voor backdrop click check
      if (textSelected) {
        recentTextSelection.current = true;
        // Reset na 300ms (genoeg tijd voor backdrop click om te checken)
        setTimeout(() => {
          recentTextSelection.current = false;
        }, 300);
      }

      // Bereken totale beweging
      const totalDeltaX = Math.abs(e.clientX - startX.current);
      const totalDeltaY = e.clientY - startYDesktop.current;

      // Alleen sluiten als ALLE voorwaarden zijn voldaan:
      // 1. Mousedown was BINNEN modal
      // 2. Mouseup is BUITEN modal
      // 3. Er is daadwerkelijk bewogen (niet alleen geklikt)
      // 4. Er is genoeg gedragged (> 30px verticaal OF > 25px horizontaal - 2x makkelijker)
      // 5. GEEN tekst geselecteerd (anders was het tekst selectie, niet drag-to-dismiss)
      // 6. GEEN drag over selecteerbaar element (anders was het tekst selectie)
      // 7. Drag richting is naar buiten (niet alleen omlaag binnen modal)
      const hasDraggedEnough = totalDeltaY > 30 || (totalDeltaX > 25 && mouseUpOutsideModal);
      const isDragToDismiss = mouseDownInsideModal.current && 
                               mouseUpOutsideModal && 
                               hasMoved.current && 
                               hasDraggedEnough && 
                               !textSelected &&
                               !draggedOverSelectable.current;

      if (isDragToDismiss) {
        // Binnen → buiten drag → sluit modal
        onCloseProp();
        // Reset direct na sluiten
        isDragging.current = false;
        startX.current = 0;
        startYDesktop.current = 0;
        startY.current = 0;
        currentY.current = 0;
        mouseDownInsideModal.current = false;
        hasMoved.current = false;
        draggedOverSelectable.current = false;
      } else {
        // Geen drag-to-dismiss - reset na kleine delay zodat backdrop click kan checken
        // Dit voorkomt dat backdrop click wordt getriggerd na een mislukte drag
        setTimeout(() => {
          isDragging.current = false;
          hasMoved.current = false;
          draggedOverSelectable.current = false;
        }, 50);
        
        // Reset andere values direct
        startX.current = 0;
        startYDesktop.current = 0;
        startY.current = 0;
        currentY.current = 0;
        mouseDownInsideModal.current = false;
      }
    };

    // Globale mouseup listener om tekst selectie te detecteren wanneer je buiten modal loslaat
    const handleGlobalMouseUp = (e: MouseEvent): void => {
      // Check of mouseup buiten modal was
      const target = e.target as Element;
      const mouseUpOutsideModal = desktopContent ? !desktopContent.contains(target) : true;
      
      // Als mouseup buiten modal was, check of er tekst geselecteerd is
      if (mouseUpOutsideModal) {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
          // Er is tekst geselecteerd en mouseup was buiten modal
          // Dit betekent waarschijnlijk tekst selectie, niet backdrop click
          recentTextSelection.current = true;
          // Reset na 300ms (genoeg tijd voor backdrop click om te checken)
          setTimeout(() => {
            recentTextSelection.current = false;
          }, 300);
        }
      }
    };

    // Event listeners op window voor desktop
    window.addEventListener("mousedown", handleDesktopMouseDown, true); // Use capture phase
    window.addEventListener("mousemove", handleDesktopMouseMove);
    window.addEventListener("mouseup", handleDesktopMouseUp, true); // Use capture phase
    window.addEventListener("mouseup", handleGlobalMouseUp, true); // Globale listener voor tekst selectie detectie

    return () => {
      window.removeEventListener("mousedown", handleDesktopMouseDown, true);
      window.removeEventListener("mousemove", handleDesktopMouseMove);
      window.removeEventListener("mouseup", handleDesktopMouseUp, true);
      window.removeEventListener("mouseup", handleGlobalMouseUp, true);
    };
  }, [onCloseProp, isMobile, isOpen, modalId, disableSwipeSelectors]);

  // Effect for opening animation
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const modal = modalRef.current;
    const overlay = overlayRef.current;
    if (!modal || !overlay) return;

    modal.style.transform = "translateY(100%)";
    overlay.style.backgroundColor = "rgba(21, 21, 21, 0)";

    // Force reflow
    modal.getBoundingClientRect();

    modal.style.transition = "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)";
    overlay.style.transition =
      "background-color 0.4s cubic-bezier(0.32, 0.72, 0, 1)";

    modal.style.transform = "translateY(0)";
    overlay.style.backgroundColor = "rgba(21, 21, 21, 0.8)";
  }, [isOpen, isMobile]);

  // Handle body scroll lock - only for top modal
  useEffect(() => {
    if (isOpen && !isClosing.current && isTopModal(modalId.current)) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      // Add ESC listener - only for top modal
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && isTopModal(modalId.current)) {
          handleClose(); // Gebruikt universele close logica
        }
      };
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    } else if (!isOpen || !isTopModal(modalId.current)) {
      // Only restore body scroll if this was the top modal or if no modals are open
      if (modalStack.length === 0) {
        document.body.style.overflow = "unset";
        document.body.style.touchAction = "unset";
      }
    }

    return () => {
      // Only restore body scroll if no modals are open
      if (modalStack.length === 0) {
        document.body.style.overflow = "unset";
        document.body.style.touchAction = "unset";
      }
    };
  }, [isOpen, onCloseProp, modalId]);

  // Cleanup effect to prevent portal errors
  useEffect(() => {
    return () => {
      // Cleanup modal stack on unmount
      removeFromModalStack(modalId.current);
      // Restore body styles if this was the last modal
      if (modalStack.length === 0) {
        document.body.style.overflow = "unset";
        document.body.style.touchAction = "unset";
      }
    };
  }, []);

  /**
   * Handler voor backdrop clicks (klikken buiten modal)
   * Gebruikt handleClose() voor smooth animatie op mobiel
   * 
   * BELANGRIJK: 
   * - Sluit NIET als er tekst geselecteerd is (anders sluit modal bij tekst selectie)
   * - Sluit NIET als mousedown binnen modal was maar mouseup buiten (drag scenario)
   */
  const handleBackdropClick = (e?: React.MouseEvent) => {
    if (!isOpen || isClosing.current || !isTopModal(modalId.current)) return;
    if (disableBackdropClick) return; // Niet sluiten als backdrop click is uitgeschakeld
    
    // 🔥 KRITIEK: Als mousedown binnen modal was, NIET sluiten
    // Dit voorkomt dat modal sluit wanneer je binnen klikt en buiten loslaat
    if (mouseDownInsideModal.current) {
      mouseDownInsideModal.current = false; // Reset voor volgende klik
      return;
    }
    
    // Check of er tekst geselecteerd is - als ja, niet sluiten (was tekst selectie, niet click)
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return; // Er is tekst geselecteerd, niet sluiten
    }
    
    // Check of er recent tekst geselecteerd was (binnen laatste 300ms)
    // Dit voorkomt dat backdrop click wordt getriggerd na tekst selectie
    if (recentTextSelection.current) {
      return; // Recent tekst selectie, niet sluiten
    }
    
    // Check of er een drag bezig was of beweging was - als ja, niet sluiten
    // (was waarschijnlijk tekst selectie of drag, niet een echte click)
    if (isDragging.current || hasMoved.current) {
      return; // Was een drag of beweging, niet een echte click
    }
    
    handleClose(); // Gebruikt smooth animatie op mobiel
  };


  // Mobile version
  if (isMobile) {
    if (!isOpen) return null;
    const mobileModal = (
      <RemoveScroll enabled={isOpen}>
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-[rgba(21,21,21,0.8)] !mt-0"
          style={{ zIndex }}
          onMouseDown={() => { mouseDownInsideModal.current = false; }}
          onClick={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className={cn(
              "fixed bottom-0 left-0 right-0",
              "h-auto w-full max-w-3xl mx-auto",
              "rounded-t-3xl bg-background overflow-hidden",
              "flex flex-col",
              className
            )}
            style={{ zIndex: zIndex + 1, maxHeight: '97dvh' }}
            onMouseDown={(e) => { e.stopPropagation(); mouseDownInsideModal.current = true; }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Handle - Groter touch area voor betere swipe */}
            <div className="absolute left-0 right-0 top-0 h-8 cursor-grab active:cursor-grabbing modal-handle z-[9999] flex items-center justify-center">
              <div className="h-1.5 w-12 rounded-full bg-gray-400 dark:bg-gray-500" />
            </div>

            {/*
              CONTEXT PROVIDER: Maakt handleClose beschikbaar voor alle children
              Modals kunnen nu useModalClose() gebruiken om smooth te sluiten
            */}
            <ModalCloseContext.Provider value={handleClose}>
              {/* Sticky Header - Mobile (buiten scroll area, also acts as drag handle) */}
              {stickyHeader && (
                <div className={cn("shrink-0 modal-handle cursor-grab active:cursor-grabbing", noPadding ? "" : "px-4")}>
                  {stickyHeader}
                </div>
              )}

              {/* Scrollable Content - Mobile */}
              <div
                ref={contentRef}
                className={cn(
                  stickyHeader ? "flex-1 min-h-0" : "flex-1",
                  overflowHidden ? "overflow-hidden" : "overflow-y-auto", // overflowHidden = geen modal scroll, alleen interne content
                  noPadding ? "" : "p-4 pt-6"
                )}
              >
                {title && (
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold leading-tight">{title}</h2>
                  </div>
                )}
                {children}
              </div>
            </ModalCloseContext.Provider>
          </div>
        </div>
      </RemoveScroll>
    );
    return typeof window !== 'undefined' && document.body ? createPortal(mobileModal, document.body) : null;
  }

  // Desktop version
  const desktopModal = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key={`desktop-modal-${modalId.current}`}
          className="fixed inset-0 !mt-0"
          style={{ zIndex }}
          onMouseDown={() => { mouseDownInsideModal.current = false; }}
          onClick={handleBackdropClick}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        >
          <RemoveScroll enabled={isOpen}>
            {/* Backdrop - blur instant in, fades out. Color fades both ways */}
            <motion.div
              className="absolute inset-0 backdrop-blur-sm"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            />
            <motion.div
              className="absolute inset-0 bg-black/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            />

            {/* Modal Container */}
            <div
              className={cn(
                "fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
                "w-full sm:max-w-[900px]",
                "h-auto",
                "flex flex-col items-center mx-auto px-6"
              )}
              style={{ maxHeight: 'calc(100vh - 5rem)' }}
            >
              {/* Animatie wrapper - bevat close button + content */}
              <motion.div
                key="desktop-modal-content"
                className={cn("relative w-full my-5 min-h-0 flex flex-col", className)}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.32, 0.72, 0, 1],
                }}
              >
                {/* Close Button - buiten overflow-hidden, op de hoek van de modal */}
                {!hideCloseButton && (
                  <button
                    onClick={handleClose}
                    className={cn(
                      "absolute right-0 -top-10 p-1.5 rounded-lg z-50",
                      "bg-muted border border-border",
                      "hover:bg-muted/80 transition-colors",
                      "text-muted-foreground hover:text-foreground",
                      "cursor-pointer shadow-sm"
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Modal Content - overflow-hidden voor rounded corners */}
                <div
                  ref={desktopContentRef}
                  className={cn(
                    "relative w-full bg-background rounded-lg min-h-0",
                    "border border-border flex flex-col overflow-hidden"
                  )}
                  onMouseDown={(e) => { e.stopPropagation(); mouseDownInsideModal.current = true; }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/*
                    CONTEXT PROVIDER: Maakt handleClose beschikbaar voor alle children
                    Modals kunnen nu useModalClose() gebruiken (ook op desktop voor consistentie)
                  */}
                  <ModalCloseContext.Provider value={handleClose}>
                    {/* Sticky Header - Desktop (buiten scroll area) */}
                    {stickyHeader && (
                      <div className={cn("shrink-0 relative z-10 bg-background", noPadding ? "" : "px-6")}>
                        {stickyHeader}
                      </div>
                    )}

                    {/* Scrollable Content - Desktop */}
                    <div
                      className={cn(
                        "flex-1 min-h-0",
                        overflowHidden ? "overflow-hidden" : "overflow-y-auto", // overflowHidden = geen modal scroll, alleen interne content
                        noPadding ? "" : "p-6"
                      )}
                    >
                      {title && (
                        <div className="mb-4">
                          <h2 className="text-2xl font-semibold leading-tight">{title}</h2>
                        </div>
                      )}
                      {children}
                    </div>
                  </ModalCloseContext.Provider>
                </div>
              </motion.div>
            </div>
          </RemoveScroll>
        </motion.div>
      )}
    </AnimatePresence>
  );
  return typeof window !== 'undefined' && document.body ? createPortal(desktopModal, document.body) : null;
}