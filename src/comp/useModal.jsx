import { useState } from 'preact/hooks';
/* Custom Hook for showing a modal dialog/componnent
* instantiate new isShowing and setIsShowing state values to store 
  the current view state of the modal.
* declare a function toggle that changes the value of isShowing to 
  be the opposite of what it is currently.
* return the value of isShowing and the toggle function from the Hook, 
   so the component has access to them.
*/
export const useModal = () => {
  const [isModalShowing, setIsShowing] = useState(false);

  function toggleModal() {
    //console.log("________ useModal() toggle() called with isShowing=",isModalShowing)
    setIsShowing(!isModalShowing);
  }

  return {
    isModalShowing,
    toggleModal,
  }
}
