import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useContext, useEffect, useState } from 'react';
import { cloneDeep, each, toNumber } from 'lodash';
import { LiftContext } from './LiftProvider';

export const MAX_SET_COUNT = 100;

const LiftModal = ({ lift }) => {
    const contentType = 'application/json';
    const [errors, setErrors] = useState({});
    const [show, setShow] = useState(false);
    const [state, setState] = useContext(LiftContext);

    const handleClose = () => {
        setShow(false);
        setSetCount(0);
        setSetForm({});
        setLiftForm(initialLiftForm);
        setIsSaving(false);
    };
    const handleShow = () => setShow(true);

    const initialLiftForm = {
        userId: lift.userId,
        name: lift.name,
        set: lift.set,
        rep: lift.rep,
        note: lift.note,
        date: new Date().toISOString().substring(0, 10),
    };
    const [liftForm, setLiftForm] = useState(initialLiftForm);
    const [setCount, setSetCount] = useState(0);
    const [setForm, setSetForm] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    //TODO: move to liftmanager
    /* The POST method adds a new entry in the mongodb database. */
  const postData = async (form) => {
        try {
        const res = await fetch('/api/lifts', {
            method: 'POST',
            headers: {
            Accept: contentType,
            'Content-Type': contentType,
            },
            body: JSON.stringify(form),
        })
        const data = await res.json();

        //Throw error with status code in case Fetch API req failed
        if (!data.success) {
            throw new Error();
        }
        let targetLift = data.data.lift;
        targetLift.sets = data.data.sets;
  
        let targetLifts = cloneDeep(state);
        targetLifts.push(targetLift);

        setState(targetLifts);
        setIsSaving(false);
       
        handleClose();
        } catch (error) {
        console.log('Failed to add lift');
        }
    }

  const setLift = (e) => {
    const target = e.target
    const value = target.value
    const name = target.name

    setLiftForm({
      ...liftForm,
      [name]: value,
    })

    if (name == 'set'){
        // if reducing the amount of sets, delete the extra sets
        if (value < setCount)
        for (let i = setCount; i > value; i--){
            delete setForm[i];
        }
        
        if (value > 100)
            setSetCount(MAX_SET_COUNT);
        else
            setSetCount(toNumber(value));
    }
  }

  const setSet = (e, index) => {
    let set = {}
    if (!setForm[index]){
        //TODO: build frontend models
        set = {
            userId: lift.userId,
            index: index,
            rep: '',
            weight: '',
            metric: 'lb',
            rpe: '',
        }
    }
    else
        set = setForm[index];

    const target = e.target
    const value = target.value
    const name = target.name

    set[name] = value;
    
    setSetForm({
      ...setForm,
      [index]: set,
    })
  }

  const formValidate = () => {
    let err = {}
    if (!liftForm.name) err.name = 'Name is required'
    if (!liftForm.set) err.set = 'Number of sets is required'
    if (!liftForm.rep) err.rep = 'Number of reps is required'
    return err
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSaving(true);
    const errs = formValidate()
    if (Object.keys(errs).length === 0) {
        postData({liftForm, setForm})
    } else {
        console.log(errs);  
      setErrors({ errs })
    }
  }

  //TODO: factor out base component for card and modal
    return (
        <>
        {/* TODO: move button up to parent */}
        <Button className="bg-primary-2 border-dark" onClick={handleShow}>
            New Lift
        </Button>

        <Modal show={show} onHide={handleClose} backdrop="static">
            <Modal.Header>
                <Modal.Title>New Lift</Modal.Title>
                <FontAwesomeIcon icon="fa-solid fa-dumbbell" />
            </Modal.Header>
            <Modal.Body>
                <div className = "flex-between-center my-2">
                    <input
                        className="bg-dark w-50"
                        type="text"
                        name="name"
                        onChange={setLift}
                        placeholder="Lift name"
                    ></input>
                </div>
                <div className="flex-between-center mb-2">
                    <div className="d-flex align-items-center">
                        <input 
                            className="bg-dark w-25"
                            type="number"
                            name="set"
                            onChange={setLift}
                            placeholder="Set"
                        ></input>
                        <FontAwesomeIcon className="mx-2" icon="fa-solid fa-x" />
                        <input 
                            className="bg-dark w-25"
                            type="number"
                            name="rep"
                            onChange={setLift}
                            required
                            placeholder="Rep"
                        ></input>
                    </div>
                    <div>
                        <input 
                            className="bg-dark"
                            type="date"
                            name="date"
                            onChange={setLift}
                            value={liftForm.date}
                            required
                        ></input>
                    </div>
                </div>
                {Array.from({ length: setCount }).map((e, i) => (
                    <div key={i} className="row mb-1">
                        <div className="col-2 d-flex align-items-center">
                            <div className="bg-dark-2 profile-pic rounded-circle flex-center">{i+1}</div>
                        </div>
                        <div className="col-5 d-flex align-items-center">
                            <input 
                                className="weight-input bg-dark h-75"
                                type="number"
                                name="weight"
                                onChange={(e) => {setSet(e, i+1)}}
                                placeholder="Weight"
                            ></input>
                            <select name="metric" onChange={(e) => {setSet(e, i+1)}} className="metric-input bg-dark text-muted h-75">
                                <option value="lb">lb</option>
                                <option value="kg">kg</option>
                            </select>
                        </div>  
                        <div className="col-5 d-flex align-items-center">
                                <input 
                                className="bg-dark h-75"
                                type="number"
                                name="rep"
                                onChange={(e) => {setSet(e, i+1)}}
                                placeholder="Rep"
                            ></input>
                            <input 
                                className="bg-dark h-75"
                                type="number"
                                name="rpe"
                                onChange={(e) => {setSet(e, i+1)}}
                                placeholder="RPE"
                            ></input>
                        </div>
                    </div>
                ))}   
            </Modal.Body>
            <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
                Cancel
            </Button>
            <Button disabled={isSaving} className="bg-primary-2 border-dark" onClick={handleSubmit}>
                {isSaving ? <span className="spinner-grow spinner-grow-sm"></span> : 'Save'}
            </Button>
            </Modal.Footer>
        </Modal>
        </>
    )
}

export default LiftModal;
