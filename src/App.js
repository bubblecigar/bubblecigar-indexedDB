import React from 'react'
import './App.css'
import styled from 'styled-components'

const mainColor = '#282c34'

function App () {
  return (
    <div className='App'>
      <header className='App-header'>
        IndexedDb
      </header>
      <CheckIDBsupport />
      <IDBContext />
    </div>
  )
}

const CheckIDBsupport = () => {
  const [support, setSupport] = React.useState(null)
  React.useEffect(
    () => {
      setSupport(Boolean('indexedDB' in window))
    }, []
  )
  return (
    <p>
      indexedDB is {support ? '' : 'not '}supported by the current browser.
    </p>
  )
}

// [object eventTargetName]
const stringifyObject = eventTarget => eventTarget.toString().slice(8, -1)

const EventCardContainer = styled.div`
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  margin: 10px;
  max-width: 100%;
`
const EventCardStyle = styled.div`
  margin: 10px;
  border: 1px solid black;
  position: relative;

  &::after {
    content: '';
    width: 0px;
    height: 0px;
    border: 7px transparent solid;
    border-left: 7px ${mainColor} solid;
    position: absolute;
    left: calc(100% + 5px);
    top: 50%;
    transform: translateY(-50%);
  }

  &:last-child::after{
    border-left: 7px transparent solid;
  }
`
const EventCardItem = styled.div`
  padding: 5px;
  border: 1px solid black;
  background-color: ${props => props.background};
  color: ${props => props.color};
`
const EventCard = ({ event }) => {
  return (
    <EventCardStyle>
      <EventCardItem background={stringifyObject(event).includes('custom') ? 'goldenrod' : mainColor} color='#fff'>
        {stringifyObject(event.target)}
      </EventCardItem>
      <EventCardItem>
        {stringifyObject(event)}
      </EventCardItem>
      <EventCardItem color={event.type === 'error' ? 'red' : 'green'}>
        {event.type}
      </EventCardItem>
    </EventCardStyle>
  )
}

const IDBContext = () => {
  const [name, setName] = React.useState('test-db')
  const [version, setVersion] = React.useState(1)

  const [eventQueue, setEventQueue] = React.useState([])
  const eventQueueRef = React.useRef([])
  const syncQueue = React.useCallback(
    () => setEventQueue([...eventQueueRef.current]), [setEventQueue]
  )

  const pushEvent = React.useCallback(
    event => {
      eventQueueRef.current.push(event)
      syncQueue()
    }, [syncQueue]
  )

  const [idb, setIdb] = React.useState(null)
  React.useEffect(
    () => {
      if (!idb) return
      idb.onclose = e => {
        pushEvent(e)
      }
      idb.onabort = e => {
        pushEvent(e)
      }
      idb.onerror = e => {
        pushEvent(e)
      }
      idb.onversionchange = e => {
        pushEvent(e)
        e.currentTarget.close()
        pushEvent({
          type: 'close',
          target: idb,
          toString: () => '[object customCloseEvent]'
        })
        setIdb(null)
      }
    }, [idb, pushEvent]
  )

  const onOpen = e => {
    const openRequest = window.indexedDB.open(name, version)
    openRequest.addEventListener('success', e => {
      if (idb) {
        idb.close()
        pushEvent({
          type: 'close',
          target: idb,
          toString: () => '[object customCloseEvent]'
        })
        setIdb(null)
      }
      setIdb(e.currentTarget.result)
      pushEvent(e)
    })
    openRequest.addEventListener('error', e => {
      pushEvent(e)
    })
    openRequest.addEventListener('upgradeneeded', e => {
      pushEvent(e)
      const idb = e.target.result
      const stores = ['store A', 'store B', 'store C', 'store D', 'store E']
      stores.forEach(
        store => {
          if (!idb.objectStoreNames.contains(store)) {
            idb.createObjectStore(store, { keyPath: 'id' })
          }
        }
      )
    })
    openRequest.addEventListener('blocked', e => {
      pushEvent(e)
      idb && idb.close() && pushEvent({
        type: 'close',
        target: idb,
        toString: () => '[object customCloseEvent]'
      })
      setIdb(null)
    })
  }

  const clearEventLog = () => {
    eventQueueRef.current = []
    syncQueue()
  }

  const onDelete = e => {
    const deleteRequest = window.indexedDB.deleteDatabase(name)
    deleteRequest.addEventListener('success', e => {
      pushEvent(e)
      setIdb(null)
    })
    deleteRequest.addEventListener('error', e => {
      pushEvent(e)
    })
  }

  const openBtnRef = React.useCallback(
    ref => {
      if (ref) {
        ref.click()
      }
    }, []
  )

  return (
    <>
      <p>
        <input
          placeholder='database name'
          value={name} onChange={e => setName(e.target.value)}
        />
        <input
          style={{ width: '40px' }}
          placeholder='version'
          type='number' min={1}
          value={version} onChange={e => setVersion(e.target.value)}
        />
        <button ref={openBtnRef} onClick={onOpen}>open</button>
        <button onClick={onDelete}>delete</button>
        <button onClick={clearEventLog}>clear log</button>
      </p>
      <EventCardContainer>
        {
          eventQueue.map(
            (event, i) => <EventCard key={i} event={event} />
          )
        }
      </EventCardContainer>
      {
        idb && (
          <Banner>
            <span>
              {idb.name}
            </span>
            <small>vers. {idb.version}</small>
          </Banner>
        )
      }
      {idb && <ObjectStore idb={idb} />}
    </>
  )
}
const Banner = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: center;
  align-items: flex-end;
  padding: 20px;
  max-width: 100%;
  background-color: ${mainColor};
  color: white;
  > span {
    margin: 5px;
    font-size: 30px;
  }
`

const FlexRow = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-evenly;
  align-items: center;
  margin: 10px;
  max-width: 100%;
`
const SelectableCard = styled.div`
  border: 1px solid black;
  padding: 10px;
  background-color: ${props => props.selected ? 'gold' : 'white'};
  color: ${props => props.selected ? 'black' : mainColor};
`
const ObjectStore = ({ idb }) => {
  const stores = React.useMemo(
    () => {
      const stores = []
      for (let i = 0; i < idb.objectStoreNames.length; i++) {
        stores.push(idb.objectStoreNames[i])
      }
      return stores
    }, [idb]
  )
  const [store, setStore] = React.useState('store A')

  return (
    <>
      <FlexRow>
        {
          stores.map(
            s => (
              <SelectableCard
                key={s}
                onClick={() => setStore(s)}
                selected={s === store}
              >
                {s}
              </SelectableCard>
            )
          )
        }
      </FlexRow>
      {store && <Transaction idb={idb} store={store} />}
    </>
  )
}

const Transaction = ({ idb, store }) => {
  const rollItem = () => {
    return ({
      id: Math.random().toFixed(2),
      name: Math.random().toFixed(2)
    })
  }

  const put = (store, item) => {
    const transaction = idb.transaction(store, 'readwrite')

    const objectStore = transaction.objectStore(store)
    const request = objectStore.put(item)
    request.onsuccess = () => console.log(request.result)
    request.onerror = () => console.log(request.result)

    transaction.oncomplete = () => {
      readStore(store)
    }
  }

  const [values, setValues] = React.useState([])
  const readStore = React.useCallback(
    store => new Promise(
      (resolve, reject) => {
        const transaction = idb.transaction(store, 'readonly')
        const objectStore = transaction.objectStore(store)
        const request = objectStore.getAllKeys()
        request.onsuccess = e => {
          resolve([...e.target.result])
        }
      }
    ).then(
      keys => new Promise(
        (resolve, reject) => {
          if (keys.length === 0) {
            resolve([])
          }
          const values = []
          for (let i = 0; i < keys.length; i++) {
            const transaction = idb.transaction(store, 'readonly')
            const objectStore = transaction.objectStore(store)
            const request = objectStore.get(keys[i])
            request.onsuccess = e => {
              values.push(e.target.result)
              if (values.length === keys.length) {
                resolve(values)
              }
            }
          }
        }
      ).then(
        values => setValues(values)
      )
    ), [idb]
  )

  React.useEffect(
    () => {
      setValues([])
    }, [store]
  )
  React.useEffect(
    () => {
      readStore(store)
    }, [idb, store, readStore]
  )

  const deleteItem = (store, key) => {
    const transaction = idb.transaction(store, 'readwrite')
    const objectStore = transaction.objectStore(store)
    const request = objectStore.delete(key)
    request.onsuccess = () => console.log(request.result)
    request.onerror = () => console.log(request.result)
    transaction.oncomplete = () => {
      readStore(store)
    }
  }

  const clearStore = store => {
    const transaction = idb.transaction(store, 'readwrite')
    const objectStore = transaction.objectStore(store)
    const request = objectStore.clear()
    request.onsuccess = () => console.log(request.result)
    request.onerror = () => console.log(request.result)
    transaction.oncomplete = () => {
      readStore(store)
    }
  }

  return (
    <div>
      <button onClick={() => put(store, rollItem())}>put</button>
      <button onClick={() => { clearStore(store) }}>clear all</button>
      <EventCardContainer>
        {
          values.map(
            value => (
              <ItemCardStyle key={value.id} onClick={() => { deleteItem(store, value.id) }}>
                <ItemCard
                  item={value}
                />
              </ItemCardStyle>
            )
          )
        }
      </EventCardContainer>
    </div>
  )
}

const ItemCardStyle = styled.div`
  margin: 10px;
  border: 1px solid black;
  
  > div {
    padding: 8px;
  }

  > div:first-child {
    background-color: ${mainColor};
    color: white;
  }
`
const ItemCard = ({ item }) => {
  return (
    <>
      <div>
        {item.id}
      </div>
      <div>
        {item.name}
      </div>
    </>
  )
}

export default App
