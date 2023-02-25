import { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { cloneDeep, size, toNumber } from "lodash";

export const MAX_SET_COUNT = 100;

const Card = ({ lift, isNew = true }) => {
    const contentType = 'application/json'
    const [editMode, setEditMode] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [message, setMessage] = useState('');
    
    const initialLiftForm = {
        userId: lift.userId,
        name: lift.name,
        set: lift.set,
        rep: lift.rep,
        note: lift.note,
        date: new Date(lift.date).toISOString().substring(0, 10),
    };
    const initialSetForm = cloneDeep(lift.sets);
    const [liftForm, setLiftForm] = useState(initialLiftForm);
    const [setCount, setSetCount] = useState(0);
    const [setForm, setSetForm] = useState(initialSetForm);

    useEffect(() => {
    if (isNew)
        setEditMode(true);
    setSetCount(size(setForm));
    }, []);

    const onCancel = () => {;
        setLiftForm(initialLiftForm);
        setSetForm(initialSetForm);
        setSetCount(size(setForm));
        setEditMode(false);
    };

    const postDelete = async (form) => {
        try {
        const res = await fetch(`/api/lifts/${lift._id}`, {
            method: 'DELETE',

        })
        if (!res.ok) {
            throw new Error(res.status);
        }
        else {
            //TODO: refresh list
        }
        } catch (error) {
        console.log('Failed to add lift');
        }
    }

    const putData = async (form) => {
        try {
          const res = await fetch(`/api/lifts/${lift._id}`, {
            method: 'PUT',
            headers: {
              Accept: contentType,
              'Content-Type': contentType,
            },
            body: JSON.stringify(form),
          })
    
          // Throw error with status code in case Fetch API req failed
          if (!res.ok) {
            throw new Error(res.status)
          }
    
          const { data } = await res.json()
          setEditMode(false);
        } catch (error) {
          setMessage('Failed to update lift')
        }
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
        const errs = formValidate()
        if (Object.keys(errs).length === 0) {
            putData({liftForm, setForm})
        } else {
            console.log(errs);  
          setErrors({ errs })
        }
      }

    function toggleEditMode(){
        setEditMode(!editMode);
    }

    function handleSetChange(e){
        let target = e.target
        let value = target.value
        let name = target.name

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

    const setLift = (e) => {                
        const target = e.target
        const value = target.value
        const name = target.name
    
        setLiftForm({
          ...liftForm,
          [name]: value,
        })
      }
    
      const setSet = (e, index) => {
        let set = {}
        if (!setForm[index]){
            //TODO: build frontend models
            set = {
                userId: lift.userId,
                liftId: lift._id,
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

    if (editMode) {
        return (
            <>
                <div className={editMode ? 'card bg-dark h-100' : 'card bg-dark'}>
                    <div className="card-body">
                        <div className = "flex-between-center my-2">
                            <input
                                className="bg-dark w-50"
                                type="text"
                                name="name"
                                onChange={setLift}
                                placeholder="Lift name"
                                value={liftForm.name}
                            ></input>
                        </div>
                        <div className="flex-between-center mb-2">
                            <div className="d-flex align-items-center">
                                <input 
                                    className="bg-dark w-25"
                                    type="number"
                                    name="set"
                                    onChange={setLift}
                                    onBlur={handleSetChange}
                                    placeholder="Set"
                                    value={liftForm.set}
                                ></input>
                                <FontAwesomeIcon className="mx-2" icon="fa-solid fa-x" />
                                <input 
                                    className="bg-dark w-25"
                                    type="number"
                                    name="rep"
                                    onChange={setLift}
                                    required
                                    placeholder="Rep"
                                    value={liftForm.rep}
                                ></input>
                            </div>
                            <div>
                                <input 
                                    className="bg-dark"
                                    type="date"
                                    name="date"
                                    onChange={setLift}
                                    required
                                    value={liftForm.date}
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
                                        value={setForm[i+1]?.weight || ''}
                                    ></input>
                                    <select name="metric" onChange={(e) => {setSet(e, i+1)}} value={setForm[i+1]?.metric || ''} className="metric-input bg-dark text-muted h-75">
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
                                        value={setForm[i+1]?.rep || ''}
                                    ></input>
                                    <input 
                                        className="bg-dark h-75"
                                        type="number"
                                        name="rpe"
                                        onChange={(e) => {setSet(e, i+1)}}
                                        placeholder="RPE"
                                        value={setForm[i+1]?.rpe || ''}
                                    ></input>
                                </div>
                            </div>
                        ))}
                        <div className="flex-between-center mt-4">
                            <button className="btn bg-light" onClick={postDelete}>Delete</button>
                            <span>
                                <button className="btn bg-secondary" onClick={onCancel}>Cancel</button>
                                <button className="btn bg-primary-2 ms-2" onClick={handleSubmit}>Save</button>
                            </span>
                        </div>
                    </div>
                </div>
            </>
        )
    }
    else {
        return (
            <>
                <div className={isExpanded ? 'card bg-dark h-100' : 'card bg-dark'}>
                    <div className="card-body overflow-auto">
                        <div className="flex-between-center">
                            <h5 className="card-title">
                                {lift.name}
                            </h5>
                            <span className="action-items">
                                {/* TODO: update to check for overflow instead of constant */}
                                {setCount > 3 && <a onClick={()=>{setIsExpanded(!isExpanded)}}><FontAwesomeIcon icon="fa-solid fa-expand" /></a>}
                                <a className="ms-3" onClick={() => toggleEditMode()}><FontAwesomeIcon icon="fa-regular fa-pen-to-square"/></a>
                            </span>
                        </div>
                        <h6 className="card-subtitle mb-2 text-muted">{lift.set} sets x {lift.rep} reps </h6>
                        {Object.entries(lift.sets).map(([key, set]) => (
                            <div key={key} className="row mb-1">
                                <div className="col-2 d-flex align-items-center">
                                    <div className="bg-dark-2 profile-pic rounded-circle flex-center">{set.index}</div>
                                </div>
                                <div className="col-5 flex-center">
                                    <h6>{set.weight} {set.metric}</h6>
                                </div>  
                                <div className="col-5 flex-center">
                                    <h6>{set.rep} reps @ RPE {set.rpe}</h6>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        )
    }
}

export default Card
